# 应用模板数据合同

本合同定义 [render.mjs](render.mjs) 的输入与输出，适用于本库 HTML 数字物料模板。品牌设计判断及验收由 [BD-SYSTEM-001](../../references/system.md#bd-system-001)与 [BD-APPLICATION-001](../../references/system.md#bd-application-001)定义。

## 品牌输入

`brand.json` 是模板消费的品牌映射，可从项目 tokens 确定性生成。项目已有数值时禁止人工维护第二套互不关联的颜色/字体；记录映射来源。它不是完整品牌规范的替代品。

| 字段 | 类型与含义 |
| --- | --- |
| schema_version | 数字 `1` |
| id / name / language | 稳定 ID、正式显示名称、HTML 语言标签；例如英文或简体中文对应语言 |
| colors | `paper`、`text`、`muted`、`brand`、`on_brand`、`rule`，均为 `#RRGGBB`；分别为浅底、主文字、次文字、强调底、强调底文字、装饰分隔线；强调底按品牌允许的背景映射，可用主色或深墨，不要求等于原色板同名键 |
| type.family | 真实字体家族名称；输出 CSS 使用本地别名 BrandTemplate，原家族保留在输入记录 |
| type.file / type.license | 字体文件及实际许可证的本地相对路径；支持 ttf / otf / woff2 |
| type.weight_min / weight_max | 文件实际可用字重范围；静态字体最小值与最大值相同 |
| type.heading_weight / body_weight / label_weight | 三个文字角色的真实可用字重，必须落在上述范围内 |
| type.heading_line_height / body_line_height / label_line_height | 标题、正文、标签行高，1–3 的有限数字倍率；按实际语言设定 |
| type.heading_tracking_em | 标题字距，-2–2 的有限数字 em 值；这是输入限界，实际数值按品牌语言与样张确定 |
| type.kerning / ligatures | 字偶距为 auto / normal / none；连字为 normal / none；按已确认品牌选择，禁止依赖浏览器隐式默认值 |
| assets.logo_on_paper / logo_on_brand | 当前内容实际使用底色对应的已选 Logo SVG；仅使用 paper 时无需 brand 变体，保留原始比例与字节 |
| assets.graphic | 可选对象 `{paper:路径或null, brand:路径或null}`；只读取实际使用底色的已验证辅助 SVG，省略或 null 表示该底色不使用辅助图形 |

资源路径相对 brand.json 所在目录解析，真实路径必须留在该目录内。把可分发的实际资源放入该品牌输入目录，不使用向上跳转或外链。渲染器检查字段与文件，不识别字体真实 family/轴/字形或许可证适用性；这些在准备输入时按 [BD-TYPE-001](../../references/assets.md#bd-type-001)核对。

## 内容与模板输入

`content.json` 为 `{schema_version:2, items:[...]}`。每项字段为 `id`、`template`、`theme`、`kicker`、`title`、`body`、`footer`、`layout`。title 为非空文本；其余文案可为空。theme 为 paper（浅底）或 brand（强调底），这是用途角色名；muted 始终表示该实例实际底色上的说明/栏目/页脚颜色，必须按允许组合映射，不能把浅底次文字色直接用于深底。template 来自 [登记表](templates.json)。同一品牌不同场景的强调底不同时，可从同一项目参数生成各物料的 brand.json，并记录来源。

文案按普通文本转义；用字符串中的 `\n` 保留明确的分行，禁止输入 HTML。原输入提供分行数组时，先按原文的行间分隔符还原完整句子并核对，再按原顺序合并为换行文本。英文在自然词间换行时还原原有空格；中文短语内换行通常不添加空格，混排按原文逐处核对。不得通过全量删除空白来掩盖单词粘连或空格丢失。模板保留显式断行，不强制均衡标题、不拆英文单词；实际自动换行仍需浏览器核对。

`layout` 为完整的具名槽映射，允许 `logo`、`title`、`body`、`kicker`、`footer`、`graphic`。Logo 与标题恒需；非空文案和实际使用的图形也必须有槽。未使用槽可省略或为 null。禁止未知槽、未知槽字段、字符串数字或以模板默认值补缺。每张画布分别映射，不能将横版坐标直接套给竖版。

| 槽字段 | 合同 |
| --- | --- |
| x / y / width / height | 所有槽必需，均为该模板原生画布的有限像素数；x/y ≥ 0，宽高 > 0，整个盒位于画布内 |
| font_size / line_height_px | 文字槽必需，字号 > 0、行高 ≥ 字号，盒高 ≥ 行高；分别来自本物料字号与行高 |
| max_lines | 文字槽必需，1–50 的整数；显式断行不可超限，自动换行总行数由浏览器测量 |
| align | 文字槽必需，left / center / right，按该品牌对齐关系映射 |

文字槽的字重通过语义角色读取：title 使用 heading，body 使用 body，kicker/footer 使用 label；标题字距使用 heading_tracking_em，其余字距为 0。更复杂的排版需求先建立合适模板版本，不注入任意 CSS。Logo 盒比例必须按原 SVG 比例计算，`object-fit:contain` 不能代替实际 Logo 尺寸验证。辅助图形同样保持比例，是否需适用色版由品牌规范决定。

从品牌规范/参数逐项映射版心、文字尺寸与行高、Logo 尺寸、外部留白、图形位置和信息顺序，并记录映射来源。渲染器只检查字段与画布边界，不计算 SVG 内部留白、真实字形、自动行数、槽间碰撞或安全区；这些必须在实际原尺寸和允许的最小展示尺寸复核。文字不裁切，超出槽时仍显示以暴露失败，不能作为已通过实例交付。

品牌、内容项与模板 ID 采用小写英文字母起始的字母/数字/短横线，最长 64 字符；内容项 ID 不重复。items 数量为 1–100。模板登记结构为 `{schema_version:1, templates:[{id,width,height,file}]}`，尺寸为 1–10000 的正整数，file 相对渲染器目录并位于其中。尺寸是工程输入限制，不是设计推荐范围。

非空 title/body/kicker/footer 必须对应 body 中的文字内容槽；只在页面标题、属性、注释或 script/style 中出现不能算消费。模板须使用显式平衡的 HTML 标签，只允许 HTML void 元素自闭合；template/noscript 及 hidden 祖先中的槽不计入。静态槽检查不能证明 CSS 实际可见或布局合格，仍需检查渲染结果。

模板使用 `{{LANG}}`、`{{BRAND_NAME}}`、`{{TITLE}}`、`{{BODY}}`、`{{KICKER}}`、`{{FOOTER}}`、`{{THEME}}`、`{{LOGO_SRC}}`、`{{GRAPHIC}}`、`{{WIDTH}}`、`{{HEIGHT}}`、`{{LAYOUT_STYLE}}` 槽。GRAPHIC 由渲染器生成固定装饰 img 或空串，Logo 路径来自资源映射。LAYOUT_STYLE 必须置于画布 main 的 style 属性，接收渲染器验证后生成的 CSS 变量；所有位置、宽高、字号和行高均按画布宽度转换为 cqw，随同一画布等比例预览。禁止把该变量槽写到注释或不生效的位置。

## 输出与更新

- 每项生成 `<id>.html`，所有项共用 `brand.css`。CSS 提供颜色、文字角色、字偶距/连字及真实本地字体加载规则；各项 layout 控制本物料实际尺寸。构建记录中的 items 保留本次完整布局参数，便于对照浏览器实测。
- `assets/` 保存字体、`OFL.txt` 许可证副本、浅底/品牌底 Logo 和可选图形。文件名是输出约定；许可证字节取自真实输入，不因文件名而推断许可类别。
- `build.json` 记录真实输入、模板/脚本及各生成文件的 SHA；自身完整性摘要按记录中的 scope 计算，避免循环包含自身文件哈希。浏览器与视觉状态为 `not_run`。
- 重复构建允许更新仍与上次记录一致的管理文件；无归属文件冲突或管理文件已被人工更改时必须报错并保留。需要保留手工版时使用新输出目录，或将调整合回项目模板后构建新版本。
- 不再使用的旧管理文件列为 stale，不能计入当前交付；不会自动删除用户文件。交付须保留 build.json、本次 outputs 列表中的文件及本轮实际证据；build.json 不列入自己的 outputs，避免自指。
- 交付可重建项目时，另外保留 brand.json、content.json、原始资源、所用模板、templates.json 和 render.mjs；保持资源与品牌输入、模板与脚本的相对目录关系，并写明本地重建命令。仅有清单里的旧机器绝对路径和 SHA 不构成可移植源。迁移后以新位置的绝对参数重新构建，记录新指纹并重新核对受影响证据。

模板、文案、Logo、颜色或字体改变后，按 [BD-QA-001](../../references/assets.md#bd-qa-001)重验受影响实例。生成文件的 SHA 不能证明文字可读、Logo 安全区合格或图片没有裁切。
