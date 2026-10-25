"use strict";

// 节点备注：DStatus 插件样板。每样能力用一处，照着改就行：
// - storage：备注按节点存（带 sid，节点删除时主控连带清掉）
// - nodes:read：读节点列表，数离线
// - timers：每分钟统计一次
// - notify：离线数超过阈值发一次通知（恢复后可再触发）
// - settings：阈值与开关来自插件卡片里的设置表单（settings.schema.json）
// - http:admin：后台接口，页面 ui/ 与 App 经它读写
// - tools：三个 AI / MCP 工具
// 只经 ctx 与系统交互；错误带 code、message。

const COLLECTION = "notes";

let state = { offline: [], total: 0, countedAt: null, alerted: false };

async function readSettings(ctx) {
  const s = await ctx.settings.get();
  return { threshold: Number.isInteger(s.threshold) ? s.threshold : 3, notify: s.notify !== false };
}

/** 全部节点（分页取完），映射成 { sid, name, online } */
async function allNodes(ctx) {
  const out = [];
  for (let page = 1; page <= 50; page++) {
    const result = await ctx.nodes.list({ page, limit: 100 });
    out.push(...result.items.map((n) => ({ sid: n.sid, name: n.name, online: n.online })));
    if (out.length >= result.total || result.items.length < 100) break;
  }
  return out;
}

async function countOffline(ctx) {
  const nodes = await allNodes(ctx);
  state = {
    ...state,
    offline: nodes.filter((n) => !n.online),
    total: nodes.length,
    countedAt: Date.now()
  };
  const settings = await readSettings(ctx);
  if (settings.notify && state.offline.length > settings.threshold) {
    if (!state.alerted) {
      state.alerted = true;
      await ctx.notify(
        "offlineOverThreshold",
        `离线节点 ${state.offline.length} 台，超过阈值 ${settings.threshold}`,
        state.offline.map((n) => `• ${n.name}`).join("\n")
      );
    }
  } else {
    state.alerted = false;
  }
  return state;
}

/** 备注列表：合并节点名（节点已删的备注会被主控级联清掉，这里只是兜底） */
async function listNotes(ctx) {
  const notes = ctx.storage.collection(COLLECTION);
  const nodes = new Map((await allNodes(ctx)).map((n) => [n.sid, n]));
  const items = [];
  let cursor = null;
  do {
    const page = await notes.list({ limit: 200, cursor: cursor || undefined });
    for (const entry of page.items) {
      const node = nodes.get(entry.key);
      items.push({
        sid: entry.key,
        name: node ? node.name : entry.key,
        online: node ? node.online : null,
        text: entry.value.text,
        updatedAt: entry.updatedAt
      });
    }
    cursor = page.next;
  } while (cursor);
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

async function setNote(ctx, sid, text, { dryRun = false } = {}) {
  const notes = ctx.storage.collection(COLLECTION);
  const node = await ctx.nodes.get(sid);
  if (!node) {
    const e = new Error("节点不存在");
    e.code = "NODE_NOTES_NO_NODE";
    throw e;
  }
  const clean = String(text || "")
    .trim()
    .slice(0, 200);
  if (dryRun)
    return { dryRun: true, sid, name: node.name, action: clean ? "set" : "delete", text: clean };
  if (!clean) {
    await notes.delete(sid);
    return { sid, name: node.name, action: "delete" };
  }
  // put 带 sid：节点删除时主控会连带删掉这条
  await notes.put(sid, { text: clean }, { sid });
  return { sid, name: node.name, action: "set", text: clean };
}

async function start(ctx) {
  // 后台接口：页面经 DStatusPlugin.api 调到这里（路径已去掉 /api/plugins/node-notes 前缀）
  ctx.http.handle(async (req) => {
    try {
      if (req.method === "GET" && req.path === "/overview") {
        return {
          status: 200,
          json: {
            success: true,
            data: {
              ...state,
              settings: await readSettings(ctx),
              notes: await listNotes(ctx),
              nodes: await allNodes(ctx)
            }
          }
        };
      }
      if (req.method === "PUT" && req.path === "/notes") {
        const body = req.body || {};
        return {
          status: 200,
          json: {
            success: true,
            data: await setNote(ctx, body.sid, body.text, { dryRun: req.dryRun })
          }
        };
      }
      if (req.method === "POST" && req.path === "/count") {
        return { status: 200, json: { success: true, data: await countOffline(ctx) } };
      }
      return {
        status: 404,
        json: { success: false, errorCode: "NOT_FOUND", message: "没有这个接口" }
      };
    } catch (error) {
      // 自己的业务错误给 4xx 与明确说明；宿主能力报的参数错（PLUGIN_*_INVALID）也算请求有问题
      const code = error && error.code ? error.code : "NODE_NOTES_ERROR";
      const status = code === "NODE_NOTES_NO_NODE" ? 404 : /_INVALID$/.test(code) ? 400 : 500;
      return {
        status,
        json: {
          success: false,
          errorCode: code,
          message: status === 500 ? "插件内部错误，请看主控日志" : error.message
        }
      };
    }
  });

  // AI / MCP 工具：入参已由主控按 manifest 的 schema 校验
  ctx.tools.handle("node_notes_list", async () => ({ ok: true, items: await listNotes(ctx) }));
  ctx.tools.handle("node_notes_set", async (args, { dryRun }) => {
    try {
      return { ok: true, ...(await setNote(ctx, args.sid, args.text, { dryRun })) };
    } catch (error) {
      return { ok: false, code: error.code || "NODE_NOTES_ERROR", message: error.message };
    }
  });
  ctx.tools.handle("node_notes_offline", async () => ({
    ok: true,
    count: state.offline.length,
    total: state.total,
    countedAt: state.countedAt,
    offline: state.offline
  }));

  // 设置改了：下一轮统计用新阈值；这里只记日志
  ctx.settings.onChange((settings) => ctx.log.info("设置已更新", settings));

  // 每分钟统计一次（第一次在一分钟后；启动时先数一次）
  ctx.timers.every("count-offline", 60 * 1000, () => countOffline(ctx));
  await countOffline(ctx);
  ctx.log.info("节点备注已启动", { total: state.total, offline: state.offline.length });
}

async function stop(ctx, { reason }) {
  // 定时器由主控清掉；没有需要收尾的在途工作
  ctx.log.info("节点备注已停止", { reason });
}

module.exports = { start, stop };
