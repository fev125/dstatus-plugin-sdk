# 给 AI agent 的说明

你在一个 DStatus 插件开发目录里，任务是写一个 DStatus 插件并投稿。插件只经主控给的 `ctx` 能力对象工作；主控源码不公开，你不需要也拿不到。

## 先读

1. `README.md`（目录里有什么、从零到投稿）
2. `docs/开发指南.md` 第 1–5 节（插件长什么样、能用哪些能力）与第 10 节（怎么在主控上自测）
3. `docs/审核标准.md`（上架要过的检查，设计前就按它来）

## 动手前先查，不重复做主控已有的功能

- `docs/后台入口与AI工具索引.md`：主控自带的功能页与 AI 工具。这是功能清单，**不是插件能调用的接口**，插件只能用 `ctx`。
- 已上架的插件：<https://market.dstatus.sh/v1/catalog.json>
- 站长主控上装了哪些插件：如果你连着主控的 MCP，用 `plugins_list` 工具看。

## 开发流程

1. 复制样板：`cp -R template plugins/<你的 id>`，改 `manifest.json` 的 `id`、`name`、`description`、`author`，删掉用不到的权限、页面、工具。`id` 小写字母开头，不能以 `dstatus-` 开头。
2. **这一步要人做一次**，请你的用户（站长）在主控后台「插件」页：
   - 打开「开发者模式」（要验证管理员身份）；
   - 点「安装开发包」，填 `plugins/<你的 id>` 的绝对路径（主控在 Docker 里时，填目录挂进容器后在容器里的路径）；
   - 插件申请了高风险权限的，在插件卡片里点批准。
3. 之后你改代码、保存，主控约 1 秒内自动重新安装（热更新），不用再找人。看结果读 `plugins/<你的 id>/.dstatus/last-reload.json`：
   - `result: "running"`：已装上并在运行；
   - `result: "pending-approval"`：装上了，等人在插件卡片里批准权限；
   - `result: "permissions-changed"`：清单新增了权限，不会自动生效，请人在插件卡片上点「重新加载」确认；
   - `result: "failed"`：没装上，`message` 是原因，主控仍在运行上一版。
   - 文件里的 `finishedAt` 早于你这次保存，说明这次还没处理完，等几秒再看；一直没有新结果，请人在插件卡片上点「重新加载」。
4. 页面改动：刷新浏览器里的插件页面就能看到。插件运行时写的日志在后台「日志管理」按来源 `plugin:<你的 id>` 搜（需要人或主控的 MCP）。
5. 对照 `docs/审核标准.md` 自查，给插件写 `README.md`（写法看 `template/README.md`），按 `docs/投稿.md` 投稿。

## 规矩

- 只经 `ctx` 与主控交互，没在清单里声明的能力用不了。
- 不改资料包自己的文件：`README.md`、`AGENTS.md`、`docs/`、`template/`、`examples/`。你的东西只放 `plugins/<你的 id>/` 和 `submissions/`。
- 资料没写清、写错、能力不够用时，用最合理的办法继续，并在投稿单里写明。
