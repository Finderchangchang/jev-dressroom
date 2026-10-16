# Jev Live · 说一句，换一身

打开摄像头，说“明天冷”换厚外套，说“明天热”换短袖。Jev 1.14 负责理解场景；Xmax、Decart Lucy 和阿里云负责生成画面。浅色界面，支持真人、小黑手绘、胖头娃娃和宇航服、纸皇冠、飘雪等玩法。

[界面预览](https://finderchangchang.github.io/jev-dressroom/) · [JevLand 中文社区](https://jevland.com/) · [验证记录](docs/validation.md)

| 方式 | 行为 | 当前验证 |
| --- | --- | --- |
| Xmax X2.0 | 摄像头连续视频；同一会话更新冷/热、画风和效果 | SDK 适配与生命周期测试通过；缺少 Xmax Key，尚未验证真实生成 |
| Decart Lucy 2.5 标准模式 | 摄像头连续视频；文字切换衣服、画风与效果 | 适配与生命周期测试通过；缺少 Decart Key，尚未验证真实生成 |
| 阿里云 Qwen Image | 截取当前一帧，生成换装图片；原始镜头继续预览 | 已用虚构人物测试图真实生成外套、短袖；不等于真人摄像头验收 |

公开 GitHub Pages 只提供静态界面，没有公共共享密钥或生成后端。真实换装需要本地运行。旧版预制角色游戏保留在 `/demo.html`，与摄像头模式分开。

## 运行

需要 Node.js 20+。

```sh
git clone https://github.com/Finderchangchang/jev-dressroom.git
cd jev-dressroom
npm ci
npm run build
npm start
```

打开 `http://127.0.0.1:8894/`。`/camera.html` 也可进入。

在启动服务的终端配置环境变量，参考 [.env.example](.env.example)。本项目不会自动读取 `.env`。Windows 已保存到用户环境变量时，可以在 PowerShell 中读取指定项后启动：

```powershell
foreach ($name in 'TYPESAFE_API_KEY','XMAX_API_KEY','XMAX_REGION','DECART_API_KEY','DASHSCOPE_API_KEY','DASHSCOPE_BASE_URL','ALI_IMAGE_MODEL') {
  $value = [Environment]::GetEnvironmentVariable($name, 'User')
  if ($value) { [Environment]::SetEnvironmentVariable($name, $value, 'Process') }
}
npm start
```

- `TYPESAFE_API_KEY`：Jev 判断。固定调用 `jev-1.14.0`，避免旧别名指向不同版本。
- `XMAX_API_KEY`：Xmax 平台长期 Key，仅留在后端。`XMAX_REGION=china` 为国内，`global` 为海外，需与账号对应。
- `DECART_API_KEY`：Decart 长期 Key，仅留在后端。使用固定 `lucy-2.5` 标准模式，不启用双倍计费的快速模式。
- `DASHSCOPE_API_KEY`：阿里云百炼 Key。选填 `DASHSCOPE_BASE_URL`，支持北京/新加坡官方地址及业务空间专属域名；程序自动取其 origin，使用图像 API 路径。Key、模型与地域必须对应。
- `ALI_IMAGE_MODEL`：默认 `qwen-image-2.1-turbo`；也可设置 `qwen-image-2.0`。模型只由服务端配置，页面不任意选择高价模型。

普通使用者无需填写 Key。两家视频服务的浏览器端仅收到临时 Key；所有服务的长期 Key 均不进入前端、Git 或本地存储。

## 怎么玩

1. 点击打开摄像头，允许本地网页使用设备。
2. 打字或点“说一句”，说“明天冷”“明天热”，Jev 更新当前方案；也可直接点衣服、画风。
3. 选 Xmax 或 Decart 后点击开始，在连续视频中更新方案；选阿里云后点击“拍一帧”，等待静态结果。
4. 阿里云可勾选“说完一句后自动生成一张”，每张独立计费，默认关闭。
5. 保存当前画面，或停止 AI 返回原始镜头。切到后台会关闭镜头与视频会话。

语音依赖浏览器的中文 SpeechRecognition 及其网络服务；不可用时可以打字。天气指令是你说出的冷热描述，不查询真实天气预报。只有实际收到生成视频首帧后才标记“实时生成”。阿里云结果始终标记“单帧图片”。

## 费用与资源

| 服务 | 单价 | 使用成本举例 |
| --- | --- | --- |
| Decart Lucy 2.5 标准（当前接入） | $0.02/秒 | 1 分钟 $1.20；1 小时 $72 |
| Decart 快速（仅列价，不启用） | $0.04/秒 | 1 分钟 $2.40；1 小时 $144 |
| Xmax X2.0 | 1 积分/秒 | 1 分钟 60 积分；现金充值价待核实 |
| 阿里云 2.1 Turbo 单帧图片 | ¥0.10/张 | 100 张 ¥10 |
| 阿里云 2.0 单帧图片 | ¥0.20/张 | 100 张 ¥20 |

[Decart 官方价格](https://docs.platform.decart.ai/getting-started/pricing)。视频按使用秒数，图片按张，不能把两者当作相同效果直接比价。

2026-10-16 核对的北京标准价：Qwen Image 2.1 Turbo **0.1 元/张**，100 张约 **10 元**；2.0 为 0.2 元/张，100 张约 20 元。免费额度、活动及其他地域价格以账号为准。[阿里云官方价格](https://help.aliyun.com/zh/model-studio/model-pricing)

Xmax 官方 FAQ 说明 X2.0 **1 积分/秒**，600 新用户积分约 10 分钟。本项目单次最多 60 积分。未登录账号的充值价格未能核实，不把积分直接换算成人民币。[Xmax FAQ](https://platform.xmax.ai/docs/resources/faq)

Jev 1.14 输入价为 $0.042/百万 token、输出免费。例如每次输入 1,000 token，100 次约 $0.0042；这是假设用量计算，不是实测账单。[TypeSafe 模型价格](https://docs.typesafe.ai/models)

本机不下载模型权重，不进行本地图像推理。摄像头请求 640×480 / 15fps；Xmax 输入按模型最小尺寸规则调整，因此实际编码/输出尺寸可能更大。各家 SDK 只在点击启动对应视频服务后加载；关闭客户端插帧、录制和音频采集。当前浏览器未找到实体摄像头，完整运行内存及视频延迟尚未实测。

## 请求与停止边界

- 摄像头默认仅本机预览。勾选“结合当前穿着”后，请求 Jev 时会发送一帧缩小 JPEG；该视觉接口仍为实验功能。
- Xmax 开始后传输连续视频。临时 Key 有效期 90 秒、额度 60 积分；页面限 60 秒，后端同时定时撤销凭据。停止时关闭 SDK、轨道副本和视图，再请求撤销。网络断开时不能保证即时撤销，额度和到期仍作兜底。
- Decart 临时 Key 只有 20 秒连接窗口、绑定本机 Origin 与 Lucy 2.5、服务端每个连接最长 60 秒。页面从点击开始计时 60 秒，禁止自动重试/重连和快速模式。临时 Key 无法撤销，过期仅阻止新连接，不能终止已经连接的会话；后端从签发后保护 80 秒再允许申请下一份。停止会断开连接并释放摄像头副本，保留本机原始预览。
- 阿里云一次仅一张，全局最多一项生成、两次请求间隔至少 10 秒。停止显示不保证取消云端已提交任务，可能仍计费；不自动重试或切换到另一家产生费用。
- 连续语音只保留一个运行任务和最新一条待执行指令，过时结果不覆盖新选择。
- 不在服务端保存照片、视频、Key 或生成历史；生成图仅在当前页面内存中显示，旧 Blob URL 会释放。提供保存按钮供使用者自行下载。
- 本地服务限定环回访问，拒绝跨站写入与非本机 Host，不提供用户输入 URL 的下载代理。不要直接作为公网多用户服务部署。

## 开发与验证

```sh
npm run build
npm run check
npm test
npm audit
```

`providers.mjs` 包含两家视频临时凭据和阿里云图像接口；`src/xmax-session.mjs`、`src/decart-session.mjs` 包含 SDK 连接、更新及释放；`src/live.js` 连接镜头、语音、Jev 和提供方。具体实测、限制和参考来源见 [验证记录](docs/validation.md)。

MIT License。原创布局与角色提示词；使用官方 SDK 和官方 API，未复制参考视频、参考项目代码或人物。JevLand 为独立中文社区，与 TypeSafe 无隶属关系。
