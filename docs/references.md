# 参考与核实记录

核实日期：2026-10-16。

## 交互参考

- 用户提供的约 31 秒换装视频：左右分栏，左侧实时呈现，右侧通过文本和衣柜选择服装。仅研究交互节奏，没有复制视频或其中的人像。
- [Allison0802/wardrobe-ai](https://github.com/Allison0802/wardrobe-ai)：由服装元数据构建候选，再让 Jev 判断场景适配。用于确认固定候选与模型判断分工的可行性，没有复用代码或图片。
- [nimobeeren/dressme](https://github.com/nimobeeren/dressme)：衣橱和造型保存的产品参考，没有复用代码或图片。
- [Drape](https://www.drape.cloud/)：真人衣橱体验方向参考。本项目采用自己的预制造型与手绘组合，不声称实现 Drape 的视频或真实试穿能力。

## 模型事实

- [TypeSafe Models](https://docs.typesafe.ai/models)：Jev 1.14 从 2026-10-14 起可用；模型 ID `jev-1.14.0`。截至本次核实，`jev-latest` 指向 1.13，`jev-preview` 指向 1.14。
- [TypeSafe Choice](https://docs.typesafe.ai/primitives/choice)：固定选项、完整概率分布、返回置信度；同一次请求放入多个问题。
- [TypeSafe API](https://docs.typesafe.ai/api)：`POST https://api.typesafe.ai/v1/systemone`，服务端 Bearer 认证，响应从 `answers` 读取。

这里只采用实际需要的文本 Choice。图片与 Box 的实验接口不在这次实现范围。

## 本项目原创部分

浅色视觉体系、“班味换装间”主题、角色 SVG、8 套服装及组合道具、场景规则、收藏和导出逻辑均为本项目新增。真人素材为独立生成的虚构人物。参考站点的商标、人物照片和代码未并入仓库。
