# 品牌语言与应用

<a id="bd-system-001"></a>
## BD-SYSTEM-001 · 从选稿到品牌语言

- 触发：已有选定 Logo，需要扩展品牌视觉语言、制作品牌手册或规定多种物料的共同用法。
- 规则：先按 [BD-INPUT-001](design.md#bd-input-001)与 [BD-EDIT-001](design.md#bd-edit-001)定位选稿、既定选择和本次用途，再建立下列实际需要的规则。用户只要求一个局部时只完成对应部分。
  1. 记录选定版本及符号、字标、组合、色版的真实路径；继承有效的最小尺寸与安全区，说明单位依据是图形、符号画布还是组合高度，区别内部留白与外部距离。重定义数值必须有本品牌实际尺寸证据。
  2. 为颜色定义用途角色与可用背景组合；为文字定义品牌名、标题、正文、辅助信息的字体/字重、行高和语言条件。项目参数保留唯一维护来源，手册与应用读取或明确映射同一数据。字体证据按 [BD-TYPE-001](assets.md#bd-type-001)，不因扩系统自动更换既有字体。
  3. 需要辅助图形时交付实际可编辑图形，写明与品牌识别的关系、缩放/裁切、密度、配色及与文字/Logo 的距离；禁止将装饰误称为新标志。摄影、插画、动效和语气只在本次场景需要时定义，缺少真实素材时明确界限，不补造业务事实。
  4. 用实际组合展示允许用法和常见错误：至少覆盖本次用到的背景、Logo 留白和文字/图形关系；错误示例必须显式标注，不能混入可用资产。
- 产物：人可浏览的品牌手册、Agent 可读取的规则、参数来源与资产映射，以及约定的辅助图形和应用入口。手册的示例、名称和数值与当前文件一致，不只展示色块和字体名称。
- 验证：以一份真实物料逐项核对规则能否执行；检查实际前景/背景对比、字体与语言、最小使用尺寸、安全区及正反例。普通文字以 4.5:1、大字（至少 24 CSS px 常规文字，或至少 18.67 CSS px 粗体）以 3:1 为数字可读性基线；不能将 Logo 的对比度例外扩大到正文，也不能据此宣称完整可访问性合规。可浏览手册按 [BD-QA-001](assets.md#bd-qa-001)做真实浏览器与窄屏检查。

<a id="bd-application-001"></a>
## BD-APPLICATION-001 · 品牌参数进入真实应用

- 触发：创建、复用或更改品牌物料模板，替换文案，或导出应用预览。
- 规则：先定义用途、画布/实际展示尺寸、信息顺序、必填与可选内容；再检索 [应用库](../libraries/applications/INDEX.md)。模板承载布局，品牌数据承载名称、资产、字体和颜色。已有模板与场景匹配时复用；不匹配时另建明确版本，不擅改已选 Logo 来迁就版式。应用是固定比例物料还是响应式页面必须写清，不能用缩小海报代替移动端正文布局。
- 产物：可编辑模板或构造源、独立内容数据、品牌参数映射、实际预览和导出入口。映射必须覆盖本用途的版心、字号/行高、字重/字距、Logo 实际尺寸和留白、图形位置、对齐与文案断行，不能只替换色值和字体名称。品牌依赖必须指向真实文件，底色变化时分别选择可用的 Logo 与辅助图形；不可用的图形按本品牌规则省略或制作适用变体。构建记录绑定当前品牌、文案、资源、模板与脚本；构建成功不自动提升视觉/浏览器状态。库渲染器按 [数据合同](../libraries/applications/contract.md)运行。
- 验证：用真实目标语言文案检查字体、换行、可读尺寸、正文完整性、文字/图形碰撞、Logo 比例与安全区。模板首次复用或布局/内容变化时，额外试一份贴近用途的较长内容；发现越界后调整排版、使用适合的模板版本或按授权改写文案，禁止静默缩字、裁切、省略或横向压扁。逐份查看实际 PNG；改背景或字体时复验受影响组合。自动沿用状态时遵循 [BD-QA-001](assets.md#bd-qa-001)的指纹与失效要求；正式资产按 [BD-EXPORT-001](assets.md#bd-export-001)和 [BD-DELIVERY-001](assets.md#bd-delivery-001)交付。

<a id="bd-token-001"></a>
## BD-TOKEN-001 · 设计系统 token

- 触发：交付设计 tokens 或设计系统，宣传物料与产品界面要共用参数，或开发交接要求完整设计系统、组件样例页或设计工具导入。
- 规则：以已确认的品牌选择为来源，按下列步骤建立唯一参数源。
  1. 定交付深度并写进交付说明。委托要求设计系统或完整 tokens，要用 [标准组件样例页规格](specimen-spec.md)验收或导入设计工具，或要求宣传物料与前端共用参数时，按完整深度；其余情况（交接包自带的组件状态示例、少量组件、把品牌接入现有页面）按最小深度，只建立本次用到的模式与角色。完整深度同时按 [BD-ICON-001](#bd-icon-001)交付图标集。
  2. 唯一来源是 `tokens.json`，格式为 `design-extract/profile-2`，定义见 [tokens-schema.md](../vendor/theme-extract/references/tokens-schema.md) §10；动手前先读 [满深度示例](../vendor/theme-extract/references/profile2-example/tokens.json)。暗色等模式写在 `modes/<mode>.json`，只改 semantic 层的引用。品牌已有其他格式的参数文件时，本次覆盖的参数以这份 `tokens.json` 为唯一来源：应用库的 `brand.json` 等能生成的文件改为从它生成；原文件中本次未迁入的部分（如最小深度下的固定画布参数）在 DESIGN.md 写明仍由原文件维护，完整深度时迁入 `typographyDisplay` 等对应位置，不手工同步两份色值。
  3. 两种深度都在 `meta.roles` 声明全部固定角色：映射到叶子，或写 `{status, reason}`，例如不投影的表面层、本次用不到的角色。完整深度还必须声明 `meta.categories` 的全部 14 个类别，每类为 present、notApplicable 或 missing，后两者写理由；notApplicable 只用于 typographyDisplay、breakpoint、zIndex、material、dataViz。
  4. 每个值写来源。继承品牌既有参数（选稿、手册、已定字体与色板）写 `confidence: measured`；本轮决定写 `derived`，并在 `$description` 写理由；采用平台惯例（如 Material 状态层透明度、WCAG 焦点指示）写 `inferred`，并在 `provenance` 写出处。不为凑满类别编造业务事实；既没有品牌依据、也不能从已知品牌选择合理推出的类别标 missing。
  5. 字阶分两组：`semantic.typography` 是产品界面阅读字阶，`semantic.typographyDisplay` 是固定画布展示字阶。两组共用字体族、`primitive.fontWeight` 字重集合、颜色角色和 `meta.notUsed`；每档显式写 fontFamily、fontSize、fontWeight、lineHeight、letterSpacing。展示字阶不直接当界面字号用。
  6. 项目语言含中文时写 `meta.languages`，并在会出现中文的字阶上用 `langOverrides.zh` 指定中文字体族、行高与字距。叶子级覆盖会整体替换分组级覆盖，代码等不应换字体的档要写自己的覆盖。基础字体族让品牌拉丁字体在前；中文覆盖让中文字体在前，使中文标点按中文字宽渲染。中文句中的拉丁字母要保持品牌字体时，在 `@font-face` 用 `unicode-range` 把品牌拉丁字体限制在拉丁范围并排除中西共用的标点（“”‘’…—·），再把它放在中文字体之前。消费方要在带 `lang` 的元素上重新应用字阶属性（如 `[lang] { font-family: var(…) }` 或给样本本身挂字阶类），只在 body 设一次时，内层其他语言的区块会沿用已计算的中文字体栈。字体按 [BD-TYPE-001](assets.md#bd-type-001)取得真实文件与许可，fallback 写进字体族列表。
  7. 颜色角色覆盖文字主/次/弱、四层表面、强调及其上文字、选中高亮、分隔线和成功/警告/错误；暗色中层级越高表面越亮。状态层给 hover、focus、pressed、dragged、disabled 的 0..1 透明度，焦点环给宽度、偏移与颜色。叶子名沿用示例中的名称，框架适配文件可以直接接线。状态透明度的参考值只作起点：叠加态文字低于 4.5:1 时先降透明度，降到 hover 与 pressed 在浏览器里仍可分辨的下限还不够，再调颜色；目检分不开时拉开两档差距。弱文字仍是可读文字，同样按 4.5:1 要求。
  8. `meta.notUsed` 列出本系统不用的手法；能用 CSS 属性或值匹配的写 `css`，供交付检查与消费方 lint 使用。
  9. 派生文件只由 [vendor 生成器](../vendor/theme-extract/scripts/build_tokens.py)生成：`uv run --quiet python <skill>/vendor/theme-extract/scripts/build_tokens.py <dir> --emit all`。禁止手改 tokens.css、适配文件、resolved 快照和 DESIGN.md frontmatter；改值时改 `tokens.json` 或 `modes/` 后重新生成。DESIGN.md 正文由本轮撰写，并写明重新生成的命令和生成器来源（本 Skill 的 vendor 目录及其 `SOURCE.json` 中的上游提交号）。生成器总会产出 Tailwind 与 shadcn 适配文件，项目不用时保留不引用；用 shadcn 时核对缺角色时的回退映射并在 DESIGN.md 写明。组件配方不用旧式 `component.button.primary` 结构，生成器会为它写固定的 frontmatter 引用。
  10. 宣传物料用 [tokens-to-brand-json](../scripts/tokens-to-brand-json.mjs)从同一 tokens 生成应用库的 `brand.json`，映射展示字阶，不另维护颜色、字重、行高与字距。
- 产物：`tokens.json`、`modes/*.json`；生成的 `tokens.css`、`tokens.tailwind.css`、`tokens.shadcn.css`、`tokens.resolved.json` 与每个非默认模式的 `tokens.resolved.<mode>.json`；DESIGN.md（frontmatter 由生成器写，正文写交付深度、角色用法、状态模型、notUsed 与缺项）；`check-tokens` 报告。落位按 [BD-HANDOFF-001](handoff.md#bd-handoff-001)。
- 验证：运行 `node <skill>/scripts/check-tokens.mjs <dir> --lint <交付的 CSS/HTML> --out <报告>`。它依次检查生成器门（类别、角色、字阶字段、字重集合）、派生文件与生成器输出逐字节一致、每个模式的角色对比度矩阵，以及 notUsed lint。对比度矩阵的阈值：文字、强调与反馈色对四层表面 4.5:1，强调上的文字 4.5:1，焦点环 3:1；按钮与链接文字叠加 hover、focus、pressed 状态层后、正文叠加 dragged 层后仍须 4.5:1（最小深度只强制主按钮文字，其余组合记为提示，由浏览器按实际用到的控件核对）。失败时改源文件后重新生成，不放宽阈值。机械通过只证明结构与数值；字阶层次、表面层级和状态是否可分，仍要在真实浏览器里用本系统的样例核对。
- 边界：本卡交付 tokens 与说明。标准组件样例页由消费方按 [样例页规格](specimen-spec.md)渲染；[BD-HANDOFF-001](handoff.md#bd-handoff-001)的消费示例属于交接包，其状态层 CSS 按规格附录 A 编写。字体子集由导出方生成。profile-2 源文件用裸数值，不是标准 DTCG 文件，不对外宣称 DTCG 兼容；需要交换时提供 resolved 快照，或另做转换并按目标工具验证。profile-2 的格式缺陷回上游 theme-extract 修复后重新 vendor，不在本 Skill 内改副本。

<a id="bd-icon-001"></a>
## BD-ICON-001 · 图标集

- 触发：设计系统、开发交接或组件示例需要界面图标。
- 规则：默认选用一套开源图标集，不自绘。按许可证（允许商用与再分发）、线性或面性、端点与转角是否与品牌几何一致筛选，只用一套，不混用。描边粗细与正文字重匹配：在 16、20、24 三档与同字号正文同排比较，笔画视觉粗细接近字干。尺寸档写进 tokens（如 `semantic.icon.size.*`）；线性图标集另写描边粗细（如 `semantic.icon.stroke`），面性或可变字重图标集记录所用字重或光学尺寸。图标颜色跟随文字的 currentColor。按钮与列表中图标与文字的间距取 `space.withinGroup` 角色，图标盒与行高同高并垂直居中。只有用户要求，或所选集缺少关键图标时才自绘，自绘沿用该集的网格与描边。
- 产物：图标集名称、版本、来源 URL 与许可证文件；本项目用到的原始 SVG 复制到 `brand/assets/icons/`，保留原文件名与路径数据；原文件未声明颜色时，只允许在根元素补 `fill` 或 `stroke` 为 currentColor，来源记录写明上游 SHA、修改后 SHA 与修改内容；tokens 中的尺寸与描边；DESIGN.md 中的集名、尺寸档、对齐方式与用法。取不到图标集时如实记录，不以占位图形冒充。
- 验证：每个 SVG 可解析，不含位图、脚本与外部引用，显示颜色跟随 currentColor（根元素属性或使用方 CSS 均可）；许可证文件真实存在并与版本对应。在浏览器按三档尺寸与正文同排截图，目检粗细与对齐。
- 边界：Logo 与辅助图形不是图标，分别按 [BD-MASTER-001](assets.md#bd-master-001)与 [BD-SYSTEM-001](#bd-system-001)处理；具体选用哪套图标集由品牌任务决定，不写进本 Skill。
