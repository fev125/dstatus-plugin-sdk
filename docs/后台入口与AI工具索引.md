# 后台入口与 AI 工具索引

主控自带的功能。写插件前先查这里，已经有的不要重复做。这是功能清单，**不是插件能调用的接口**：插件只能用开发指南第 4 节的 `ctx` 能力。

## 后台入口

### 核心管理

- 控制台（`/admin/dashboard`）
- 服务器管理（`/admin/servers`）
  - 服务器列表（`/admin/servers#list`）
  - 主动探针（`/admin/servers#active-probes`）
  - 分组管理（`/admin/groups`）
  - 商家管理（`/admin/merchants`）
  - 自动发现（`/admin/autodiscovery`）
- 网络监控（`/admin/monitor`）
  - 监控目标（`/admin/monitor#monitor-targets`）
  - 探测节点（`/admin/monitor#monitor-nodes`）
  - 流媒体检测（`/admin/monitor#monitor-streaming`）
  - 路由检测（`/admin/monitor#monitor-route-detection`）
  - 监控设置（`/admin/monitor#monitor-settings`）
  - 可观测性（`/admin/monitor#monitor-observability`）
- 通知管理（`/admin/notification`）
  - 通知规则（`/admin/notification#tasks`）
  - 通知记录（`/admin/notification#events`）

### 系统

- 设置中心（`/admin/settings`）
  - 设置总览（`/admin/settings`）
  - 数据库与存储（`/admin/settings#tab-database`）
- 安全访问（`/admin/security-settings`）
  - 安全设置（`/admin/security-settings`）
  - 访问控制（`/admin/access-control`）
- 个性化（`/admin/personalization`）
- 插件（`/admin/plugins`）
- 授权管理（`/admin/license-management`）

### 工具

- 定时任务（`/admin/scheduled-tasks`）
- 文件管理（`/admin/file-management`）
- 日志管理（`/admin/log-management`）
- 高级分析（`/admin/analytics`）
- 账单报告（`/admin/billing-report`）
- SSH脚本（`/admin/ssh_scripts`）

## AI 助手与 MCP 工具

站长在主控的 AI 助手或 MCP 客户端里能直接用这些工具；名字后是中文名与用途。

### 查询

- `status` 读取站点概况：站点概览（版本、运行时、数据库类型、节点数量）
- `servers` 读取节点列表：节点列表（名称/在线状态/分组名/标签名及 SSH 地址摘要：host/port/ipv6/landedIp
- `notification_health` 检查通知是否正常：通知系统诊断（通道就绪/错误计数等，已脱敏）
- `alerts_recent` 查看最近告警：最近告警事件摘要（按类型/级别聚合，不展示内部标识）
- `notification_events_recent` 查看最近的通知：最近通知投递留痕摘要（聚合计数，不回显正文/请求体/响应体）
- `nodes_snapshot` 读取所有节点实时数据：节点实时指标快照（CPU/内存/磁盘百分比、系统负载+在线状态
- `node_snapshot` 读取节点实时数据：单节点实时指标快照（按 sid 或 name 选择
- `monitor_targets` 读取监控目标：网络监控目标列表（名称/区域及区域 id/模式/类型及 host/port
- `tcping_series` 读取延迟数据：TCPing 延迟/丢包趋势（1h/4h/24h/7d/30d 摘要版）
- `http_series` http_series：HTTP 可用率与延迟摘要（1h/4h/24h/7d/30d）
- `alerts_list` 查看告警列表：最近告警明细列表（默认窗口 24h
- `alert_event` 查看告警详情：单条告警事件 + 投递链路聚合（按 eventId 查询）
- `traffic_series` 读取流量数据：节点流量用量/配额（used/limit/remaining）+ 近24h/31d/12m 曲线（按 sid 或 name）
- `load_series` 读取负载数据：节点负载/带宽时间序列（cpu/mem/swap/ibw/obw）
- `node_groups` 读取分组：节点分组列表（id/name/isDefault）
- `node_tags` 读取节点标签：节点标签总览：每个标签名及带该标签的节点数 nodeCount
- `agent_status` 查看探针状态：节点 Agent 汇总状态
- `site_config_summary` 读取站点设置：站点配置安全摘要（仅名称与 URL 等非凭据字段）
- `notification_channel_readiness` 检查通知渠道：通知通道就绪状态（不含 token/secret）
- `runtime_status` 查看主控运行状态：DStatus 运行时状态（Node 版本、uptime、数据库模式）
- `merchants_list` 读取商家：读取商家列表（仅 id、name、adminUrl、affUrl）
- `merchant_aff_tag_settings_get` 读取推广标签设置：读取购买同款与商家名称标签注入设置
- `personalization_get` 读取个性化设置：读取个性化页的全站设置：默认明暗、配色、壁纸、毛玻璃、首页模块（资产预览、地区分布与 2D/3D 地图、节点情况、网络情况）、卡片字段、网速单位、游客可见项、顶
- `plugins_list` 查看插件：读取后台「插件」页的内置插件：id、名称、说明、分组、是否开启（enabled，站长的选择）与运行状态（state：enabled/disabled/faile
- `groups_list` 读取分组：读取分组列表（仅 id、name、top、isDefault、serverCount）
- `alert_rules_list` 读取通知规则：读取告警规则列表（业务字段投影
- `alert_rule_get` 查看通知规则：按 id 读取一条告警规则（安全投影，不含渠道凭据）
- `notification_channels_list` 读取通知渠道：读取通知渠道列表
- `notification_channel_get` 查看通知渠道：按 type（及 webhook 的 id）读取一条通知渠道
- `billing_summary` 读取账单汇总：节点成本按币种汇总月/年等价（amountMajor 主单位，原币不跨币种相加）
- `server_costs_list` 读取服务器费用：节点成本列表：sid/name、商家名、amountMajor+currency（另附人民币折算 amountCny，缺汇率为 null）、billingCyc
- `merchant_costs_list` 读取商家费用：按商家聚合节点成本
- `renewals_list` 读取续费提醒：续费日历与到期节点，每条附人民币折算 amountCny
- `ops_logs_recent` 读取运行日志：最近日志（timestamp/level/module/message/安全 context）
- `scheduled_tasks_list` 读取定时任务：定时任务列表：名称、enabled、schedule/nextRun/lastRun/lastStatus
- `auto_discovery_list` 读取自动发现：自动发现 pending/approved 节点（sid/name/status/发现时间/来源/IP）
- `ssh_scripts_list` 读取脚本库：SSH 脚本元数据（id/name/description/tags/updatedAt/available）
- `ssh_script_get` 查看脚本：读取一条 SSH 脚本
- `analytics_overview` 读取分析概览：高级分析聚合：节点/网络/负载/流量/告警
- `node_enrollment_status` 查看节点接入状态：查询节点接入授权的有效期、状态与已接入节点数量
- `streaming_unlock_status` 查看解锁检测状态：查询指定节点的原生流媒体/AI 检测状态、已有范围和报告摘要
- `streaming_unlock_reports` 读取解锁检测报告：读取指定节点原生流媒体/AI 报告
- `mtr_schedules_list` 查看路由检测计划：列出某节点的路由检测（MTR）定时计划、运行状态与名额
- `mtr_snapshots_list` 查看路由检测记录：列出节点的路由检测记录（快照），可按目标、是否路由变化、时间筛选
- `network_diagnose_result` 读取诊断结果：读取 network_diagnose 返回的诊断任务结果
- `monitor_regions_list` 查看监控地区：列出网络监控的地区（监控目标按地区分组）
- `monitor_settings_get` 查看监控设置：读取网络监控的设置：探测参数（间隔、包数、超时等）、并发上限、服务状态页设置

### 修改

- `merchant_create` 新建商家：创建商家
- `merchant_update` 修改商家：按 id 完整更新商家名称、后台地址和推广地址
- `merchant_delete` 删除商家：按 id 删除商家
- `merchant_aff_tag_settings_update` 修改推广标签设置：更新购买同款与商家名称标签注入设置
- `personalization_update` 修改个性化设置：修改个性化页的全站设置（对所有访客生效，不是个人偏好）
- `plugin_set_enabled` 启用或停用插件：开启或关闭一个内置插件（对整个站点生效）
- `plugin_dev_mode_off` 关闭插件开发者模式：关闭插件开发者模式：所有开发中的插件（plugins_list 里 dev=true，没经官方市场审核）立即停止，数据与设置保留
- `group_create` 新建分组：创建分组
- `group_update` 修改分组：按 id 修改分组名称或排序
- `group_delete` 删除分组：按 id 删除分组
- `group_set_default` 设置默认分组：保留兼容工具
- `groups_reorder` 调整分组顺序：按 items[{id,top}] 更新分组排序
- `monitor_target_create` 新建监控目标：创建 TCPing/HTTP 监控目标
- `monitor_target_update` 修改监控目标：按 id 完整更新 TCPing/HTTP 监控目标，语义与后台一致
- `monitor_target_rename` 修改监控目标：只修改监控目标显示名称
- `monitor_target_delete` 删除监控目标：按 id 删除监控目标
- `alert_rule_create` 新建通知规则：创建普通告警规则
- `alert_rule_update` 修改通知规则：按 id 更新告警规则
- `alert_rule_delete` 删除通知规则：按 id 软删除普通告警规则
- `alert_rule_set_enabled` 启用或停用通知规则：按 id 启用或停用告警规则
- `alert_rule_test` 发送告警测试：对已有规则做真实测试发送（参数 id/sid/stage）
- `notification_channel_update` 修改通知渠道：字段级 patch 现有渠道非核心配置
- `notification_webhook_create` 新建 Webhook：创建 Webhook 渠道
- `notification_webhook_update` 修改 Webhook：按 id 字段级更新 Webhook，只传要改的字段，未传的保持原值
- `notification_webhook_delete` 删除 Webhook：按 id 删除 Webhook 渠道，并重载现有 provider 缓存
- `auto_discovery_approve` 批准自动发现的节点：批准一台自动发现的待审核节点，批准后开始上报数据
- `auto_discovery_reject` 拒绝自动发现的节点：拒绝一台自动发现的待审核节点，从待审核列表移除，不会加入节点
- `node_enrollment_prepare` 生成安装命令：生成统一节点接入命令
- `node_enrollment_revoke` 撤销节点接入：撤销节点接入授权并停止后续安装
- `server_install_agent` 安装探针：在已配置节点上通过 SSH 安装或更新 DStatus Agent
- `server_create` 新建节点：创建节点（canonical 字段）
- `server_update` 修改节点：稀疏更新节点（canonical patch）
- `streaming_unlock_run` 运行流媒体解锁检测：按节点已有范围发起一次原生 Agent 流媒体/AI 检测
- `server_renew` 节点续费：给节点手动续费一期：从“当前到期日与今天中较晚的那天”往后顺延 1 个月 / 3 个月 / 1 年（与节点列表的续费按钮相同）
- `server_set_expire` 修改节点到期日：把节点到期日改成指定日期（北京时间当天 23:59:59 到期）
- `server_auto_renew_confirm` 确认自动续费：确认一次处于观察期（renewals_list / 节点账单状态为 observing）的自动续费，确认后不再等待节点在线判断
- `scheduled_task_create` 新建定时任务：新建定时任务
- `scheduled_task_update` 修改定时任务：修改定时任务：只传要改的项
- `scheduled_task_delete` 删除定时任务：删除一个定时任务（不影响已产生的运行记录）
- `scheduled_task_run_now` 立即运行定时任务：立即运行一次定时任务（不改变计划）
- `probe_upgrade` 升级探针：把一台节点的探针升级到最新版：已是最新则跳过
- `probes_bulk_upgrade` 批量升级探针：一次升级多台节点的探针，只需用户确认一次：逐台按 probe_upgrade 的规则执行（最多 4 台同时），返回每台结果——已是最新、已下发升级任务、经 SS
- `servers_bulk_edit` 批量修改节点：一次修改多台节点的同一批设置（与节点列表的批量编辑相同）：只传要改的字段
- `mtr_schedule_create` 新建路由检测计划：给节点新建路由检测（MTR）定时计划：按小时 / 天 / 周检测到目标的路由，路由变化可触发告警（需要路由检测授权）
- `mtr_schedule_update` 修改路由检测计划：修改节点的路由检测计划：只传要改的项（需要路由检测授权）
- `mtr_schedule_delete` 删除路由检测计划：删除节点的一个路由检测计划（关联的路由变化告警规则一并处理，与后台删除相同）
- `mtr_snapshot_delete` 删除路由检测记录：删除节点的一条路由检测记录
- `monitor_region_create` 新建监控地区：新建网络监控地区
- `monitor_region_update` 修改监控地区：修改监控地区的名称与说明（名称必填）
- `monitor_region_delete` 删除监控地区：删除监控地区
- `monitor_settings_update` 修改监控设置：修改网络监控设置，只传要改的组：schedule 探测参数（只改传入项，其余保持当前值）、concurrency 并发上限、statusPage 服务状态页（页
- `monitor_targets_batch_create` 批量新建监控目标：按节点或分组批量新建监控目标（每台节点一个目标，检测它的地址）
- `monitor_targets_batch_delete` 批量删除监控目标：批量删除监控目标（逐个走与单个删除相同的流程：取消在途任务、清理历史），返回每个的成败

### 服务器命令

- `terminal_execute` 在服务器上执行命令：在指定 sid 节点执行非交互式单行 shell 命令
- `terminal_cancel` 停止命令：取消尚未完成的终端执行

### 命令输出

- `terminal_status` 查看命令进度：查询终端执行状态
- `terminal_output_lines` 查看命令输出：读取终端执行输出片段
- `terminal_output_search` 搜索命令输出：在可读取终端输出中搜索文本

### 服务器文件

- `file_read` 读取文件：按行分页读取指定 sid 节点上的 UTF-8 文本文件
- `file_edit` 修改文件：对指定 sid 节点上的 UTF-8 文本文件做精确唯一匹配编辑（可 dryRun）
- `file_upload` 上传文件：上传文件到指定 sid 节点：小文件 put
- `file_download` 下载文件：从指定 sid 节点下载文件：小文件 get

### 安全填写密码与密钥

- `secure_input_request` 请求安全输入：需要密码、私钥、API Key 等敏感信息时优先调用此工具，不要让用户在对话里直接发送
- `secure_input_status` 查询安全输入状态：查询安全输入代号的状态：pending 用户还没填写，ready 已填写可直接使用，expired 已失效（过期、作废、不存在或面板已重启，需重新请求用户填写）

### 网页搜索与读取

- `web_search` 搜索网页：在公开网页上搜索最新资料（版本、公告、价格、故障信息、文档等），返回标题、链接和摘要
- `web_fetch` 读取网页：读取一个公开网页的正文（只支持 http/https 公网地址），返回网页标题与正文节选

### 网络诊断

- `network_diagnose` 网络诊断：从节点发起一次网络诊断（与节点详情的诊断工具相同）：mtr 路由追踪、tcping 端口连通、iperf3 带宽测试
