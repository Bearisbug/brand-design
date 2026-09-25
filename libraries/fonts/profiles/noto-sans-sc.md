# Noto Sans SC

## 角色与选择依据

用于简体中文标题、正文、UI 和西文字体的中文接续。此次取 Google Fonts 的 Noto Sans SC 文件；不要将本文件名混称为 Noto Sans CJK SC，也不要推断不同发行包字形数量、格式或版本相同。[官方文件目录](https://github.com/google/fonts/tree/main/ofl/notosanssc)

本库用它使 Tracefold / 迹序的中文正文、中文名称与全角标点拥有同一确定来源。它可独立承载中英混排；拉丁标题另用 Space Grotesk 是本样张的品牌选择，不是硬性搭配要求。

## 文件与范围

- 文件：[NotoSansSC-VF.ttf](../files/noto-sans-sc/NotoSansSC-VF.ttf)，原始可变 TrueType，字体内版本为 `Version 2.004-H2;hotconv 1.0.118;makeotfexe 2.5.65603`。
- 实测字轴：`wght` 100–900，文件默认 100；没有 `wdth` 或 `ital` 轴。当前只使用直立字形。
- 来源：[Google Fonts 固定提交](https://github.com/google/fonts/tree/a85815a42757630ce188fdad368c2dfc444d4773/ofl/notosanssc)。精确 URL、SHA-256 和字表元数据见 [sources.json](../sources.json)。
- 本文件 `cmap` 记录 30,890 个 Unicode 码点；该计数不是语言全面覆盖保证。样张中的简体中文、英文、数字、中英文标点与 ASCII 已逐字符核验。
- 字体表包含 `locl`、`palt`、`vert`、`vrt2` 等特性，本轮不声称已验证竖排或各地区字形。繁体字、罕见姓名、扩展汉字、日文、韩文等须按实际任务重新检查。

## 试排与接续

[Tracefold / 迹序样张](../specimen.html) 使用 600 字重中文品牌名和标题、400 正文。已设置真实 12 / 14 / 16 CSS px 的正文样行；这些是检查尺度，不能写成所有应用的最小字号标准。

英文品牌排版接续栈为 `Space Grotesk → Noto Sans SC → sans-serif`。代码接续到此文件时，中文保留该字体的字宽；不承诺和 JetBrains Mono 一起形成双宽中文终端网格。样张包含不存在首选家族后的本地字体接续试验。

当前原始 TTF 为 17,772,300 字节，适用于库内和离线母版使用。生产 Web 接入需单独设定分片、子集、压缩和性能预算，并保留派生记录；本次未验证网络传输性能。

## 许可

[OFL 原文](../licenses/noto-sans-sc-OFL.txt)记录 Adobe 版权及保留字体名称 `Source`。随包分发必须保留原文；修改字体软件时应遵守 OFL 对保留名称等条件。当前原始文件未经裁字、轮廓修改或内部命名修改。
