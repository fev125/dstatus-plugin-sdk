"use strict";

/**
 * 到期提醒（expiry-watch）
 *
 * 每小时检查一次节点到期时间（节点视图 expireAt，毫秒时间戳，可能为 null），
 * 列出 N 天内到期的节点；节点第一次进入「N 天内到期」窗口时发一条通知，
 * 离开窗口（续费、改到期时间、删除）后再进入才会再发。
 *
 * 只经 ctx 与宿主交互：nodes:read / timers / storage / notify / http:admin / tools。
 *
 * 资源口径：
 * - 定时器 1 个（每小时）；节点列表按 100/页顺序翻页，同一时刻只有一个列表请求在途。
 * - 存储：集合 notified 每个已提醒节点 1 条（≈200 B，带 sid，节点删除时随之删除）；
 *   集合 state 1 条记录最近一次检查结果（≤ 节点数 × ~120 B，上限 256 KiB 以内按 1000 节点算足够）。
 * - 日志：每次检查最多 1 条 info（有变化时）+ 出错时 1 条 error。
 */

const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 7;
const MIN_DAYS = 1;
const MAX_DAYS = 365;
const PAGE_LIMIT = 100;
const MAX_PAGES = 100; // 1 万节点兜底，防止 total 不稳定时死循环

const EVENT_KEY = "nodeExpiring";
const COLL_NOTIFIED = "notified";
const COLL_STATE = "state";
const STATE_KEY = "lastScan";

/** @type {any} */
let host = null;
/** 当前生效的提醒天数 */
let currentDays = DEFAULT_DAYS;
/** 最近一次检查结果（内存缓存，启动时从存储恢复） */
let lastScan = null;
/** 正在进行中的检查（Promise），用于合并并发请求 */
let scanning = null;

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function makeError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/** 把任意输入规整成合法天数；不合法返回 null */
function normalizeDays(value) {
  if (typeof value === "string" && value.trim() !== "") value = Number(value);
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < MIN_DAYS || value > MAX_DAYS) return null;
  return value;
}

function daysFromSettings(settings) {
  const d = normalizeDays(settings && settings.days);
  return d === null ? DEFAULT_DAYS : d;
}

/** 剩余天数：向上取整，今天到期算 0，已过期为负数 */
function daysLeft(expireAt, now) {
  return Math.ceil((expireAt - now) / DAY_MS);
}

function formatDate(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function describeLeft(left) {
  if (left < 0) return `已过期 ${-left} 天`;
  if (left === 0) return "今天到期";
  return `剩 ${left} 天`;
}

// ---------------------------------------------------------------------------
// 节点与存储
// ---------------------------------------------------------------------------

/** 顺序翻页取全部节点（宿主要求同一时刻只能有一个列表请求在途） */
async function listAllNodes() {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const res = await host.nodes.list({ page, limit: PAGE_LIMIT });
    const items = Array.isArray(res && res.items) ? res.items : [];
    all.push(...items);
    const total = typeof res.total === "number" ? res.total : all.length;
    if (items.length < PAGE_LIMIT || all.length >= total) break;
  }
  return all;
}

/** 读出所有「已提醒」记录，返回 Map<sid, { key, value, version }> */
async function loadNotified() {
  const coll = host.storage.collection(COLL_NOTIFIED);
  const map = new Map();
  let cursor;
  for (let guard = 0; guard < 1000; guard += 1) {
    const res = await coll.list({ limit: 200, cursor });
    for (const item of res.items || []) map.set(item.key, item);
    if (!res.next) break;
    cursor = res.next;
  }
  return map;
}

async function saveLastScan(scan) {
  const coll = host.storage.collection(COLL_STATE);
  try {
    await coll.put(STATE_KEY, scan);
  } catch (err) {
    host.log.warn("保存最近检查结果失败", { code: err && err.code, message: err && err.message });
  }
}

async function restoreLastScan() {
  try {
    const rec = await host.storage.collection(COLL_STATE).get(STATE_KEY);
    const value = rec && typeof rec === "object" && "value" in rec ? rec.value : rec;
    if (value && Array.isArray(value.items)) lastScan = value;
  } catch (err) {
    host.log.warn("恢复最近检查结果失败", { code: err && err.code, message: err && err.message });
  }
}

// ---------------------------------------------------------------------------
// 核心：检查
// ---------------------------------------------------------------------------

/**
 * 执行一次检查。
 * @param {{ dryRun?: boolean, trigger: string }} opts dryRun 时不发通知、不写存储、不更新缓存
 */
async function runScan(opts) {
  const dryRun = Boolean(opts && opts.dryRun);
  const trigger = (opts && opts.trigger) || "unknown";
  const now = Date.now();
  const days = currentDays;
  const windowEnd = now + days * DAY_MS;

  const nodes = await listAllNodes();
  const expiring = [];
  for (const n of nodes) {
    if (!n || typeof n.sid !== "string") continue;
    const expireAt =
      typeof n.expireAt === "number" && Number.isFinite(n.expireAt) ? n.expireAt : null;
    if (expireAt === null) continue;
    if (expireAt > windowEnd) continue;
    expiring.push({
      sid: n.sid,
      name: n.name || n.sid,
      group: n.group && n.group.name ? n.group.name : null,
      online: Boolean(n.online),
      expireAt,
      expireDate: formatDate(expireAt),
      daysLeft: daysLeft(expireAt, now)
    });
  }
  expiring.sort((a, b) => a.expireAt - b.expireAt);

  // 与「已提醒」记录对比，找出新进入窗口的与已离开窗口的
  const notified = await loadNotified();
  const inWindow = new Set(expiring.map((x) => x.sid));
  const entered = expiring.filter((x) => !notified.has(x.sid));
  const left = [...notified.keys()].filter((sid) => !inWindow.has(sid));

  const scan = {
    checkedAt: now,
    days,
    trigger,
    total: nodes.length,
    items: expiring,
    newlyEntered: entered.map((x) => x.sid),
    left,
    notified: false,
    dryRun
  };

  if (dryRun) return scan;

  // 1) 离开窗口的：删掉记录，下次再进入会重新提醒
  const coll = host.storage.collection(COLL_NOTIFIED);
  for (const sid of left) {
    try {
      await coll.delete(sid);
    } catch (err) {
      host.log.warn("清理已提醒记录失败", { sid, code: err && err.code });
    }
  }

  // 2) 新进入窗口的：发一条通知（汇总），再逐个记录
  if (entered.length > 0) {
    const title = `有 ${entered.length} 个节点将在 ${days} 天内到期`;
    const lines = entered.map((x) => `${x.name}：${x.expireDate}（${describeLeft(x.daysLeft)}）`);
    let delivered = false;
    try {
      const r = await host.notify(EVENT_KEY, title, lines.join("\n"));
      delivered = Boolean(r && r.delivered);
    } catch (err) {
      // 通知发不出去（没配渠道、被站长关掉等）不算检查失败；仍记为已提醒，避免每小时重复
      host.log.warn("发送到期通知失败", { code: err && err.code, message: err && err.message });
    }
    scan.notified = delivered;

    for (const x of entered) {
      const value = { sid: x.sid, name: x.name, expireAt: x.expireAt, notifiedAt: now, days };
      try {
        await coll.insert(x.sid, value, { sid: x.sid });
      } catch (err) {
        if (err && err.code === "PLUGIN_STORAGE_EXISTS") {
          // 并发或上次写了一半：覆盖即可
          try {
            await coll.put(x.sid, value, { sid: x.sid });
          } catch (e2) {
            host.log.warn("记录已提醒节点失败", { sid: x.sid, code: e2 && e2.code });
          }
        } else {
          host.log.warn("记录已提醒节点失败", { sid: x.sid, code: err && err.code });
        }
      }
    }
  }

  if (entered.length > 0 || left.length > 0) {
    host.log.info(
      `到期检查完成：${expiring.length} 个在 ${days} 天内到期，新进入 ${entered.length}，离开 ${left.length}`,
      {
        trigger
      }
    );
  }

  lastScan = scan;
  await saveLastScan(scan);
  return scan;
}

/** 合并并发：同一时刻只跑一次非 dryRun 的检查 */
function scanOnce(trigger) {
  if (scanning) return scanning;
  scanning = runScan({ trigger })
    .catch((err) => {
      host.log.error("到期检查失败", {
        trigger,
        code: err && err.code,
        message: err && err.message
      });
      throw err;
    })
    .finally(() => {
      scanning = null;
    });
  return scanning;
}

/** 给页面与工具的只读视图 */
function viewOf(scan) {
  return {
    days: currentDays,
    checkedAt: scan ? scan.checkedAt : null,
    total: scan ? scan.total : null,
    items: scan ? scan.items : []
  };
}

// ---------------------------------------------------------------------------
// 设置
// ---------------------------------------------------------------------------

async function loadDays() {
  try {
    const settings = await host.settings.get();
    currentDays = daysFromSettings(settings);
  } catch (err) {
    host.log.warn("读取设置失败，使用缺省天数", { code: err && err.code });
    currentDays = DEFAULT_DAYS;
  }
}

/** 修改天数（整份替换设置，带修订号防并发覆盖；冲突重试一次） */
async function setDays(days) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const cur = await host.settings.getWithRevision();
    const value = Object.assign({}, (cur && cur.value) || {}, { days });
    try {
      await host.settings.set(value, { expectedRevision: cur ? cur.revision : undefined });
      currentDays = days;
      return;
    } catch (err) {
      if (err && err.code === "PLUGIN_SETTINGS_CONFLICT" && attempt === 0) continue;
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// 后台接口（页面经 DStatusPlugin.api 调用）
// ---------------------------------------------------------------------------

function httpError(status, errorCode, message) {
  return { status, json: { ok: false, errorCode, message } };
}

async function handleHttp(req) {
  const method = String(req.method || "GET").toUpperCase();
  const path = String(req.path || "/");

  // GET /expiring ：最近一次检查结果（还没检查过就先检查一次）
  if (method === "GET" && path === "/expiring") {
    if (!lastScan) {
      try {
        await scanOnce("http:first");
      } catch (err) {
        return httpError(502, "SCAN_FAILED", `检查失败：${(err && err.message) || "未知错误"}`);
      }
    }
    return { status: 200, json: Object.assign({ ok: true }, viewOf(lastScan)) };
  }

  // POST /check ：立即检查；dryRun 时只算不发不写
  if (method === "POST" && path === "/check") {
    try {
      if (req.dryRun) {
        const scan = await runScan({ dryRun: true, trigger: "http:dryRun" });
        return {
          status: 200,
          json: Object.assign(
            { ok: true, dryRun: true, newlyEntered: scan.newlyEntered },
            viewOf(scan)
          )
        };
      }
      const scan = await scanOnce("http:manual");
      return {
        status: 200,
        json: Object.assign(
          { ok: true, newlyEntered: scan.newlyEntered, notified: scan.notified },
          viewOf(scan)
        )
      };
    } catch (err) {
      return httpError(502, "SCAN_FAILED", `检查失败：${(err && err.message) || "未知错误"}`);
    }
  }

  return httpError(404, "NOT_FOUND", `没有这个接口：${method} ${path}`);
}

// ---------------------------------------------------------------------------
// AI / MCP 工具
// ---------------------------------------------------------------------------

async function toolList(args) {
  try {
    if ((args && args.refresh) || !lastScan) await scanOnce("tool:list");
  } catch (err) {
    return {
      ok: false,
      code: "SCAN_FAILED",
      message: `检查失败：${(err && err.message) || "未知错误"}`
    };
  }
  const v = viewOf(lastScan);
  return {
    ok: true,
    days: v.days,
    checkedAt: v.checkedAt,
    count: v.items.length,
    items: v.items.map((x) => ({
      sid: x.sid,
      name: x.name,
      group: x.group,
      expireAt: x.expireAt,
      expireDate: x.expireDate,
      daysLeft: x.daysLeft,
      status: describeLeft(x.daysLeft)
    }))
  };
}

async function toolSetDays(args, meta) {
  const days = normalizeDays(args && args.days);
  if (days === null) {
    return {
      ok: false,
      code: "INVALID_DAYS",
      message: `days 必须是 ${MIN_DAYS}–${MAX_DAYS} 的整数`
    };
  }
  const from = currentDays;
  if (meta && meta.dryRun) {
    return {
      ok: true,
      dryRun: true,
      from,
      to: days,
      changed: from !== days,
      message: `将把提醒天数从 ${from} 改为 ${days}（预览，未保存）`
    };
  }
  if (from === days)
    return { ok: true, from, to: days, changed: false, message: `提醒天数已经是 ${days}` };
  try {
    await setDays(days);
  } catch (err) {
    return {
      ok: false,
      code: (err && err.code) || "SETTINGS_WRITE_FAILED",
      message: `保存设置失败：${(err && err.message) || "未知错误"}`
    };
  }
  // 天数变了，窗口随之变化，立即重算一次（失败不影响设置已保存的结果）
  scanOnce("tool:setDays").catch(() => {});
  return { ok: true, from, to: days, changed: true, message: `提醒天数已从 ${from} 改为 ${days}` };
}

// ---------------------------------------------------------------------------
// 生命周期
// ---------------------------------------------------------------------------

async function start(ctx) {
  host = ctx;
  scanning = null;

  await loadDays();
  await restoreLastScan();

  ctx.settings.onChange((settings) => {
    const next = daysFromSettings(settings);
    if (next !== currentDays) {
      currentDays = next;
      scanOnce("settings:change").catch(() => {});
    }
  });

  ctx.http.handle(handleHttp);
  ctx.tools.handle("expiry_watch_list", toolList);
  ctx.tools.handle("expiry_watch_set_days", toolSetDays);

  ctx.timers.every("hourly-check", CHECK_INTERVAL_MS, async () => {
    try {
      await scanOnce("timer");
    } catch (_) {
      // 已在 scanOnce 里记日志；不让定时器抛错拖垮插件
    }
  });

  // 定时器第一次要等一个间隔才触发；启动后先跑一次，不阻塞 start（15 秒上限）
  scanOnce("start").catch(() => {});
}

async function stop(ctx, { reason } = {}) {
  // 定时器由宿主清掉；进行中的检查让它自然结束
  if (reason === "disabled") ctx.log.info("到期提醒已关闭；已提醒记录保留，重新开启后继续");
  // 不把 host 置空：进行中的检查可能还要写日志；下次 start 会重新赋值
  scanning = null;
}

module.exports = { start, stop };
