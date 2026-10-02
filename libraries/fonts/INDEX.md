# 字体与搭配库

用于 `visual-system` 的字体选型、真实文案试排与字体文件交接。先按语言和角色选档案，再看样张；本库的搭配是已测候选，不是所有品牌的默认组合。执行规则以 Skill 入口及其字体规则为准，用户已有字体选择优先。

## 已收录家族

| 家族与档案 | 角色 | 已取得文件 | 实际可变轴 | 已测语言与边界 |
| --- | --- | --- | --- | --- |
| [Space Grotesk](profiles/space-grotesk.md) | 英文品牌排版、展示标题 | [TTF](files/space-grotesk/SpaceGrotesk-VF.ttf) · Version 2.000 | `wght` 300–700 | 英文、数字、西文标点；中文转 Noto Sans SC |
| [Noto Sans SC](profiles/noto-sans-sc.md) | 中文标题、正文、UI 与中文接续 | [TTF](files/noto-sans-sc/NotoSansSC-VF.ttf) · Version 2.004-H2 | `wght` 100–900 | 本样张简体中文、英文、数字、中西文标点；其他语言未做完整排版验收 |
| [JetBrains Mono](profiles/jetbrains-mono.md) | 数字、参数、代码 | [TTF](files/jetbrains-mono/JetBrainsMono-VF.ttf) · Version 2.305 | `wght` 100–800 | 英文、数字、代码符号；中文接续后不承诺整行等宽 |

三份字体均为官方仓库固定 commit 的原始 TTF，仅调整本地文件名；没有裁字、修改轮廓、改名表或全局安装。各家的 OFL 原文随包保留。[sources.json](sources.json) 是文件来源、版本、字轴、字形数、许可和 SHA-256 的唯一数据源；档案中的用途判断为本库整理与评论，不代表字体作者的品牌推荐。

## 搭配 01：Tracefold / 迹序

[打开真实字体样张](specimen.html) · [桌面截图](shots/specimen-desktop.png) · [移动截图](shots/specimen-mobile.png) · [逐字符检查数据](font-inspection.json) · [浏览器验证](browser-verification.json)

适用：有中文界面、英文产品名和技术参数的 AI / SaaS 品牌。Tracefold / 迹序为虚构验证品牌；副标题是“让每次决策都有来处。”。

| 角色 | 样张选择 | 判断与限制 |
| --- | --- | --- |
| 英文品牌排版 | Space Grotesk 600，`letter-spacing: -0.055em` | 用字宽与局部几何细节形成产品感；这是字标排版研究，未作专有字形定制 |
| 中文品牌名 | Noto Sans SC 600 | 中文以独立字面大小配对；避免把中英文强制设为相同视觉高度 |
| 英文标题 / 正文 | Space Grotesk 500 / 400 | 标题紧凑；正文保留舒适行距 |
| 中文标题 / 正文 | Noto Sans SC 600 / 400 | 中文用较松行距，正文 16 CSS px、小字号 12 / 14 CSS px 单独检查 |
| 数字 / 代码 | JetBrains Mono 500 / 400 | 数字列右对齐；样张关闭代码连字以便核对字符 |

本样张的品牌字号、字距和颜色只属于此搭配证据，不写成其他品牌的固定参数。移动样张将并列文字换行排布；正式 Logo 的比例由品牌母版定义。

## 使用与交接

1. 从档案确认所需角色、字重和文字覆盖；用项目真实品牌名及全部待交付文案复验缺字。`document.fonts.check()` 不能单独证明字形存在，需结合字体 `cmap` 或实际字形渲染。
2. 通过 `@font-face` 绑定相对文件；样张用 `BD …` 作为 CSS 别名，不修改字体内部家族名。明确可变权重区间，设置 `font-synthesis: none`，不要把默认实例名里的 Light / Thin 误当成只有一个字重。
3. 英文和代码栈分别接续 Noto Sans SC。该中文字体本身不可用时，系统 `sans-serif` 仅是运行降级，不能声明字体交付验收通过。
4. 只把本项目使用的字体与对应 OFL 一同复制到品牌包。保留版权和许可证；分发、修改与保留名称条件以实际 OFL 原文为准。字体不单独销售。
5. 当前文件供本地样张和可编辑母版使用。Noto Sans SC 原始 TTF 约 17.8 MB；生产网站按实际字符集与性能预算再决定字体分片或 WOFF2 派生，记录派生来源和许可条件。此库未验证网络加载性能、所有字轴端点、印刷或其他操作系统。

```css
/* src 路径须相对使用它的样式表重新解析。完整声明见 specimen.html。 */
--font-display: "BD Space Grotesk", "BD Noto Sans SC", sans-serif;
--font-body: "BD Noto Sans SC", sans-serif;
--font-code: "BD JetBrains Mono", "BD Noto Sans SC", monospace;
```

## 数据结构与维护

`sources.json` 使用 `schema_version: 1`；顶层 `fonts` 为家族数组，`id` 唯一且与档案 slug 一致。`files[].path`、`license_file` 及证据路径均相对此目录；`official_url` 是官方说明入口，`upstream_repository` 是实际下载仓库，`upstream_commit` 属于该下载仓库。`files[].source_url` 与 `license_source_url` 固定到取得文件的 commit。SHA 为实际本地字节的 SHA-256；`name_version`、`axes`、`metrics`、`features` 来自字体表解析，未知字段用 `null` 并说明。`validation_scope` 限定家族实测范围，`pairings` 关联实际搭配样张与证据。

新增家族至少交付档案、实际使用文件及许可、来源记录、真实文案样张；更新字体字节后重新计算校验、解析字体表并实测浏览器。搭配验证状态限定到具体文本、字号、字重、浏览器与截图，不能用一个样张代表全部语言、平台和用途。

当前验证：三个文件通过签名、SHA-256、name / fvar / cmap 解析；实际样张文案在指定字体和最终本地接续字体中有字形。本机 Microsoft Edge 152 在 1440 × 1000、390 × 844 视口加载三份本地文件；字体栅格指纹均与系统替代字体不同，中文接续指纹与直接 Noto 渲染一致。已目检深浅底、字号与中英混排，键盘字重调节通过，页面及文本行未发现溢出，console / page errors 为 0。此状态仅覆盖以上样张范围。
