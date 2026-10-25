// 节点备注页面：所有数据经 DStatusPlugin.api 调本插件的后台接口；提示与确认用主控自己的。
(function () {
  "use strict";
  var esc = function (v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var app = document.getElementById("app");
  var data = null;

  async function api(method, path, body) {
    var r = await DStatusPlugin.api(method, path, { body: body });
    if (!r.json || r.json.success !== true)
      throw new Error((r.json && r.json.message) || "HTTP " + r.status);
    return r.json.data;
  }

  function render() {
    var s = data.settings;
    app.innerHTML =
      '<section class="ds-card"><div class="ds-row" style="justify-content:space-between"><div><h2 class="ds-card__title">离线统计</h2>' +
      '<p class="ds-card__desc" style="margin:0">共 ' +
      data.total +
      " 台，离线 <b>" +
      data.offline.length +
      "</b> 台，阈值 " +
      s.threshold +
      "（" +
      (s.notify ? "超过即通知" : "不通知") +
      "）" +
      (data.countedAt ? " · 上次统计 " + new Date(data.countedAt).toLocaleTimeString() : "") +
      "</p></div>" +
      '<button type="button" class="ds-btn ds-btn--sm" data-action="count">现在统计</button></div>' +
      (data.offline.length
        ? '<div class="ds-row" style="margin-top:8px">' +
          data.offline
            .map(function (n) {
              return '<span class="ds-badge ds-badge--error">' + esc(n.name) + "</span>";
            })
            .join("") +
          "</div>"
        : "") +
      "</section>" +
      '<section class="ds-card"><h2 class="ds-card__title">备注</h2><p class="ds-card__desc">给节点记一句话；节点删除时备注自动清掉</p>' +
      '<form class="ds-row" id="form"><select class="ds-select" name="sid" style="flex:1;min-width:160px">' +
      data.nodes
        .map(function (n) {
          return (
            '<option value="' +
            esc(n.sid) +
            '">' +
            esc(n.name) +
            (n.online ? "" : "（离线）") +
            "</option>"
          );
        })
        .join("") +
      "</select>" +
      '<input class="ds-input" name="text" placeholder="备注内容，留空为删除" maxlength="200" style="flex:2;min-width:200px"><button class="ds-btn ds-btn--primary" type="submit">保存</button></form>' +
      '<div class="ds-table-wrap" style="margin-top:12px"><table class="ds-table"><thead><tr><th>节点</th><th>备注</th><th>更新时间</th><th></th></tr></thead><tbody>' +
      (data.notes.length
        ? data.notes
            .map(function (n) {
              return (
                '<tr data-sid="' +
                esc(n.sid) +
                '"><td>' +
                esc(n.name) +
                "</td><td>" +
                esc(n.text) +
                '</td><td class="ds-small ds-muted">' +
                new Date(n.updatedAt).toLocaleString() +
                '</td><td><button type="button" class="ds-btn ds-btn--sm ds-btn--ghost" data-action="remove">删除</button></td></tr>'
              );
            })
            .join("")
        : '<tr class="ds-table__empty"><td colspan="4">还没有备注</td></tr>') +
      "</tbody></table></div></section>";
  }

  async function load() {
    data = await api("GET", "/overview");
    render();
  }

  app.addEventListener("click", async function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    try {
      if (btn.dataset.action === "count") {
        await api("POST", "/count", {});
        DStatusPlugin.toast("已统计", "success");
        await load();
      }
      if (btn.dataset.action === "remove") {
        var sid = btn.closest("tr").dataset.sid;
        if (
          !(await DStatusPlugin.confirm({
            title: "删除备注？",
            content: "只删备注，不动节点。",
            confirmText: "删除",
            danger: true
          }))
        )
          return;
        await api("PUT", "/notes", { sid: sid, text: "" });
        DStatusPlugin.toast("已删除", "success");
        await load();
      }
    } catch (err) {
      DStatusPlugin.toast(err.message, "error");
    }
  });
  app.addEventListener("submit", async function (e) {
    e.preventDefault();
    var form = e.target;
    try {
      await api("PUT", "/notes", { sid: form.sid.value, text: form.text.value });
      DStatusPlugin.toast("已保存", "success");
      await load();
    } catch (err) {
      DStatusPlugin.toast(err.message, "error");
    }
  });

  DStatusPlugin.ready()
    .then(load)
    .catch(function (err) {
      app.innerHTML = '<div class="ds-alert ds-alert--error">' + esc(err.message) + "</div>";
    });
})();
