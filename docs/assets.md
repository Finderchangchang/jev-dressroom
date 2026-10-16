# 素材说明

`assets/real-looks.png` 为本项目通过内置 ImageGen 生成的原创 AI 人物造型表。画布为 4 列 × 2 行，前端只用 CSS 裁出对应格子，没有将参考视频的人物或帧加入仓库。

人物设定：同一位虚构成年东亚女性，约 27 岁，自然全身站姿，浅色摄影棚，同机位同尺度；非真实人物写真。

生成提示词要点：

```text
Photorealistic fashion contact sheet, exactly eight equal rectangular cells,
4 columns × 2 rows, no gaps, no captions, no text, no branding.
Same fictional adult East Asian woman around 27 in every cell, shoulder-length
black hair, full body and shoes visible, neutral relaxed pose, fixed scale.
Identical warm-white studio backdrop, subtle floor shadow, soft daylight.
Row 1: sage sweatshirt with off-white pants and iced coffee; charcoal suit with
red tie and laptop; yellow raincoat and boots with closed umbrella; cream
hoodie with blue jeans and headphones.
Row 2: silver astronaut-inspired suit without helmet; white chef shirt with
green apron and wooden spatula; lavender cape and small paper crown; black tee
with pink tulle skirt and sunglasses.
Natural fabrics, fully clothed, not sexualized. No collage overlap.
```

完整素材尺寸 1448 × 1086。前端和导出按每格宽 362 像素、第一行高 512 像素、第二行高 574 像素的实际边界读取，并保持人物比例。真人模式明确标记“AI 原创人物 · 整套造型示意”。SVG 人物、衣服和图标由代码绘制，不需要第三方图片库。
