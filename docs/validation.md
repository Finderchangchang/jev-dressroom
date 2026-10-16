# 验证记录 · 2026-10-16

本次目标是让同一网页支持 Jev 决策、Xmax 连续视频和阿里云单帧换装。服务端不记录 Key、输入帧或生成历史；以下测试产物位于忽略的 output 目录，没有上传个人摄像头画面。

## 已实际请求的云端链路

测试输入为仓库已有 AI 生成虚构成年人物的一格，非用户自拍。Jev 1.14 对“明天天气冷，给我换厚外套”选择 cold，对“明天天气热，换件短袖”选择 hot。请求耗时分别为 1351ms、342ms，随后分别验证阿里云换衣；耗时不是连续视频延迟。

| 模型 / 指令 | 结果 | 本次耗时 |
| --- | --- | --- |
| Qwen Image 2.0 / cold | 米色羽绒外套与毛衣，保持人物和杯子 | 3767ms |
| Qwen Image 2.0 / hot | 白色短袖与浅色短裤 | 3712ms |
| Qwen Image 2.1 Turbo / hot（默认分辨率） | 短袖换装成功 | 14043ms |
| Qwen Image 2.1 Turbo / ink + cold + snow | 白点眼睛小黑角色、外套、飘雪 | 13177ms |
| Qwen Image 2.1 Turbo / doll + hot + crown | 胖头角色、短袖、皇冠 | 12808ms |
| Qwen Image 2.1 Turbo / hot（限制 768×1024） | 生成成功；随后作为默认尺寸策略 | 5003ms |

已人工查看外套、短袖、小黑和胖头结果。这是少量样本，不能推算平均/最坏延迟、身份保持准确率或每次画风一致性。当前优先使用官方标价更低的 2.1 Turbo，可由服务端切换 2.0。

## 本地检查

- 20 项 Node 测试通过：固定选项、图文请求校验、服务端访问边界、Xmax 凭据额度/单会话/撤销失败锁定、阿里云单张与并发/间隔限制、非法图片地址、连续指令合并、SDK 停止和失败释放。
- `npm run build`、`npm run check` 通过；`npm audit` 0 vulnerabilities。Xmax SDK 间接依赖的 fast-xml-parser 覆盖为 5.11.2；本项目不调用 SDK 文件上传功能。
- 使用真实 Xmax SDK 离线实例验证模型配置、Context、VideoView 枚举及尺寸解析：640×480 请求按 X2.0 约束解析为 896×672，15fps。未把这项当成生成测试。
- 浏览器能加载新版 UI、切换阿里云模式、显示后台配置状态及连接说明。点击开启镜头返回“没有找到摄像头”，错误路径正常。
- 页面不在加载时导入 Xmax；仅启动实时视频时动态加载 SDK。浏览器只保留当前图片及最多一条待执行指令。
- 阿里云实测后，Node 服务工作集一次采样约 68MB。这只包含后端，不包含浏览器或真实 Xmax 运行；不能当作整个项目的内存上限。

## 尚未通过的验收

本机没有 XMAX_API_KEY，Xmax 平台仍需账号登录；当前浏览器没有可用摄像头。真实摄像头采集 → 实际语音 → Jev → Xmax 连续换衣、视频首帧/热切换延迟、整段内存和设备兼容性仍待测。接口或生命周期测试不代替这些验收。

阿里云已经验通真实 API 的图像编辑，但尚未在本机实体摄像头与实际麦克风上完成整条用户流程。静态图不能当成实时视频展示。

## 官方接口与价格来源

- [Xmax 官方 Web SDK](https://github.com/XingMai/XmaxSDK-Web)、npm `@xmaxai/web-sdk@1.0.9`。
- [Xmax 身份验证](https://platform.xmax.ai/docs/authentication)：长期 Key 由后端换取临时凭据。
- [Xmax FAQ](https://platform.xmax.ai/docs/resources/faq)：X2.0 1 积分/秒，新用户 600 积分；现金充值价格尚未核实。
- [阿里云图像生成与编辑 API](https://help.aliyun.com/zh/model-studio/qwen-image-generation-and-editing-api-reference)：2.1 Turbo 支持 Base64 图像编辑，使用同步 multimodal-generation 路径。
- [阿里云 2.0 图像编辑 API](https://help.aliyun.com/zh/model-studio/qwen-image-edit-api)。
- [阿里云标准价格](https://help.aliyun.com/zh/model-studio/model-pricing)：北京 2.1 Turbo 0.1 元/张、2.0 0.2 元/张。活动、免费额度和地区另计。
- [TypeSafe 模型文档](https://docs.typesafe.ai/models)：Jev 1.14 输入 $0.042/百万 token，输出免费。
