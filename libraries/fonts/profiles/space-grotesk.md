# Space Grotesk

## 角色与选择依据

用于英文品牌名排版、展示标题及短正文。设计师将其描述为从 Space Mono 衍生的比例无衬线字体，保留部分等宽字体细节并调整阅读表现。[作者官方仓库](https://github.com/floriankarsten/space-grotesk)

本库选择它为 Tracefold 提供几何感和易读的整词轮廓。这是为新品牌选择的重建字体，不是风格库参考作品的已识别原字体。当前样张为原字形排版，不能宣称完成专有字标构造。

## 文件与范围

- 文件：[SpaceGrotesk-VF.ttf](../files/space-grotesk/SpaceGrotesk-VF.ttf)，原始可变 TrueType，Version 2.000。
- 实测字轴：`wght` 300–700，文件默认 300；没有 `wdth` 或 `ital` 轴。本库未取得斜体。
- 来源：[Google Fonts 固定提交](https://github.com/google/fonts/tree/00a38a53f92aef923b9353f40128e8f4552ddae4/ofl/spacegrotesk)。精确 URL、SHA-256 和字表元数据见 [sources.json](../sources.json)。
- 官方说明覆盖拉丁文字、越南语、拼音及多种欧洲语言；本轮实际验证仅为英文品牌文案、可打印 ASCII、数字及样张中的西文标点。中文和全角中文标点不在此文件的覆盖范围。
- 字体表包含 `tnum`、`pnum`、`onum`、`lnum`、`zero` 等特性。存在该标签不代表本轮验证了其全部字形效果；表格数字需要额外启用并试排，代码优先看 JetBrains Mono。

## 试排与接续

[Tracefold / 迹序样张](../specimen.html) 使用 600 字重英文字标、500 标题和 400 正文；300–700 可用滑块比较。中文接续 Noto Sans SC。`font-synthesis: none` 禁止浏览器伪造不存在的粗斜体；需要斜体时另取实际支持的文件并核验。

样张中的字距为该品牌排版选择；正式定稿前仍需在目标尺寸核对 `Tr`、`ac`、`ef`、`fo`、`ld` 的光学间距。未验证全部欧洲语言、所有 OpenType 组合、印刷或其他系统。

## 许可

[OFL 原文](../licenses/space-grotesk-OFL.txt)随本地字体保留。字体软件使用 SIL Open Font License 1.1；分发时保留版权及许可文本，修改字体时逐项遵守原文条件。当前文件只改了本地文件名，二进制未改动。
