/* 到期提醒 后台页面脚本：所有数据经 DStatusPlugin.api 走本插件接口 /api/plugins/expiry-watch/... */
(function () {
  "use strict";

  var $ = function (id) {
    return document.getElementById(id);
  };
  var summary = $("summary");
  var alertBox = $("alert-box");
  var table = $("table");
  var rows = $("rows");
  var empty = $("empty");
  var btnCheck = $("btn-check");
  var btnReload = $("btn-reload");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtTime(ms) {
    if (!ms) return "尚未检查";
    var d = new Date(ms);
    var p = function (n) {
      return String(n).padStart(2, "0");
    };
    return (
      d.getFullYear() +
      "-" +
      p(d.getMonth() + 1) +
      "-" +
      p(d.getDate()) +
      " " +
      p(d.getHours()) +
      ":" +
      p(d.getMinutes())
    );
  }

  function badge(daysLeft) {
    var tone, text;
    if (daysLeft < 0) {
      tone = "error";
      text = "已过期 " + -daysLeft + " 天";
    } else if (daysLeft === 0) {
      tone = "error";
      text = "今天到期";
    } else if (daysLeft <= 3) {
      tone = "warning";
      text = "剩 " + daysLeft + " 天";
    } else {
      tone = "info";
      text = "剩 " + daysLeft + " 天";
    }
    return '<span class="ds-badge ds-badge--' + tone + '">' + esc(text) + "</span>";
  }

  function showAlert(text) {
    alertBox.innerHTML = text ? '<div class="ds-alert">' + esc(text) + "</div>" : "";
  }

  function render(data) {
    var items = Array.isArray(data.items) ? data.items : [];
    summary.textContent =
      "提醒天数 " +
      data.days +
      " 天 · " +
      (data.total != null ? "共 " + data.total + " 个节点 · " : "") +
      items.length +
      " 个即将到期 · 上次检查 " +
      fmtTime(data.checkedAt);

    if (items.length === 0) {
      table.hidden = true;
      empty.hidden = false;
      rows.innerHTML = "";
      return;
    }
    empty.hidden = true;
    table.hidden = false;
    rows.innerHTML = items
      .map(function (x) {
        var sub = x.group ? '<div class="ds-muted ds-small">' + esc(x.group) + "</div>" : "";
        return (
          "<tr>" +
          "<td>" +
          esc(x.name) +
          sub +
          "</td>" +
          '<td class="ds-mono">' +
          esc(x.expireDate) +
          "</td>" +
          "<td>" +
          badge(x.daysLeft) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function busy(on) {
    btnCheck.disabled = on;
    btnReload.disabled = on;
  }

  function errorText(r) {
    return (
      (r && r.json && (r.json.message || r.json.errorCode)) ||
      "请求失败（HTTP " + (r && r.status) + "）"
    );
  }

  async function load() {
    busy(true);
    showAlert("");
    try {
      var r = await DStatusPlugin.api("GET", "/expiring");
      if (r.status === 200) render(r.json);
      else showAlert(errorText(r));
    } catch (e) {
      showAlert("加载失败：" + (e && e.message ? e.message : e));
    } finally {
      busy(false);
    }
  }

  async function checkNow() {
    busy(true);
    showAlert("");
    try {
      var r = await DStatusPlugin.api("POST", "/check");
      if (r.status === 200) {
        render(r.json);
        var n = Array.isArray(r.json.newlyEntered) ? r.json.newlyEntered.length : 0;
        DStatusPlugin.toast(
          n > 0
            ? "检查完成，新增 " +
                n +
                " 个进入提醒窗口的节点" +
                (r.json.notified ? "，已发通知" : "")
            : "检查完成，没有新进入提醒窗口的节点",
          "success"
        );
      } else {
        showAlert(errorText(r));
        DStatusPlugin.toast("检查失败", "error");
      }
    } catch (e) {
      showAlert("检查失败：" + (e && e.message ? e.message : e));
    } finally {
      busy(false);
    }
  }

  btnCheck.addEventListener("click", checkNow);
  btnReload.addEventListener("click", load);

  DStatusPlugin.ready().then(load, function (e) {
    showAlert("页面桥未就绪：" + (e && e.message ? e.message : e));
  });
})();
