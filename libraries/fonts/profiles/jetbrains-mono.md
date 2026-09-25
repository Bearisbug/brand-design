# JetBrains Mono

## 角色与选择依据

用于代码、参数、追踪 ID 与需要等宽数字的界面。官方将其定位为开发者字体，提供代码连字及可辨认字符设计。[JetBrains 官方仓库](https://github.com/JetBrains/JetBrainsMono)

本库用它让 Tracefold 的代码与数值区形成稳定节奏；通常不需要把所有产品正文都改成等宽字体。

## 文件与范围

- 文件：[JetBrainsMono-VF.ttf](../files/jetbrains-mono/JetBrainsMono-VF.ttf)，原始可变 TrueType，字体内版本为 Version 2.305。
- 实测字轴：`wght` 100–800，文件默认 400；没有 `wdth` 或 `ital` 轴。本次仅取得直立变量文件，官方另外的斜体和 NL 文件未入库。
- 来源：[JetBrains 固定提交](https://github.com/JetBrains/JetBrainsMono/tree/19371302b95d218af43299bce79ddbddd0bc364d/fonts/variable)。这里记录实际文件版本，不用官网说明或上一发布标签替代内部版本。URL 与 SHA-256 见 [sources.json](../sources.json)。
- 实测覆盖英文品牌名、可打印 ASCII、数字及样张代码符号；中文及全角中文标点需要接续。其他拉丁语言、希腊文、西里尔文等范围未做本轮完整排版验收，不把可用字符数等同于语言质量保证。
- 字体表包含 `calt`、`zero`、`ss01` 等特性；样张通过 `font-variant-ligatures: none` 关闭连字，以检查 `0O`、`1Il`、`>=`、`!==`、`=>` 等字符。需要连字时用实际编辑器或浏览器再验。

## 试排与接续

[Tracefold / 迹序样张](../specimen.html) 的数字使用 500，代码使用 400；数字列右对齐，显示 `1,024`、`98.6%`、金额与带符号变化量。代码字号为 13 CSS px，移动视口允许长代码行换行，不通过横向裁切隐藏字符。

中文注释使用 Noto Sans SC 接续。此组合没有验证终端单元格宽度，不能作为终端中文等宽承诺。需要斜体时必须取得真实 Italic 文件；不要依靠浏览器合成。

## 许可

[OFL 原文](../licenses/jetbrains-mono-OFL.txt)随字体保留，字体软件为 SIL Open Font License 1.1。官方仓库的源代码许可与字体文件许可需区分；本库只交接当前字体及其 OFL，不将源代码的许可套在字体上。当前文件只调整本地文件名，字节未修改。
