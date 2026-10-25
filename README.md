# DStatus 插件开发资料

给要为 DStatus 主控写插件的人，也给替人写插件的 AI。插件只经主控给的 `ctx` 能力对象工作，不需要也拿不到主控源码；纯 JavaScript（CommonJS），不需要构建工具。

拿到这份资料：克隆本仓库，或运行 `npx dstatus@latest plugin init <目录>`（内容相同，自动 `git init`）。让 AI agent 来写，就告诉它：「运行上面的命令，按目录里的 AGENTS.md 开发一个 XX 插件」。

## 这里有什么

| 路径 | 内容 |
|---|---|
| `AGENTS.md` | 给替你写插件的 AI agent 的说明（先读什么、热更新怎么看结果、哪些事要找人） |
| `docs/开发指南.md` | 完整说明：清单、能力（ctx）与权限、后台页面、AI 工具、设置表单、升级迁移、自测 |
| `docs/审核标准.md` | 上架官方插件市场要过的检查，动手前先看一遍 |
| `docs/投稿.md` | 怎么投稿、怎么更新 |
| `docs/图标清单.md` | 清单与页面能用的图标 |
| `docs/后台入口与AI工具索引.md` | 主控自带的功能页与 AI 工具，动手前先查，别重复做 |
| `template/` | 样板「节点备注」：每样能力用一次，复制改名就能开始 |
| `examples/expiry-watch/` | 更接近真实插件的例子「到期提醒」 |
| `plugins/` | 你的插件放这里，一个插件一个目录 |
| `submissions/` | 投稿单 |

## 从零到投稿

1. 读 `docs/开发指南.md` 第 1–5 节，知道插件长什么样、能用哪些能力。
2. 复制样板：`cp -R template plugins/<你的 id>`，改 `manifest.json` 的 `id`、`name`、`description`、`author`，删掉用不到的权限、页面、工具。`id` 小写字母开头，不能以 `dstatus-` 开头。
3. 在你自己的主控上打开开发者模式，「安装开发包」填 `plugins/<你的 id>` 的绝对路径（指南第 10 节）。
4. 改代码、保存，主控约 1 秒内自动重新安装；结果看 `plugins/<你的 id>/.dstatus/last-reload.json`，页面改动刷新浏览器即可，日志在后台「日志管理」搜来源 `plugin:<你的 id>`。
5. 对照 `docs/审核标准.md` 自查，给插件写 `README.md`（写法看 `template/README.md`）。
6. 按 `docs/投稿.md` 投稿。

## 约定

- 协议版本固定 `2`。主控新增能力时会写明从哪个版本起有，用清单的 `engines.dstatus` 声明最低版本。
- 后台页面引用主控提供的 `/plugin-ui-sdk/v1/` 设计套件与页面 SDK，类型声明在 `/plugin-ui-sdk/v1/dstatus-plugin-ui.d.ts`。
- `template/` 与 `examples/` 的代码可以随意复制修改（MIT）。
