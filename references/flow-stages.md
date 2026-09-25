# 品牌设计阶段导航

按 [BD-INPUT-001](design.md#bd-input-001)确定本轮范围，按 [BD-EDIT-001](design.md#bd-edit-001)定位已有版本与选择。每段均可从已有成果进入；只执行本次产物需要的步骤，跳过无关阶段和已完成工作。

## 一、Logo 与资产

**从哪里进入：**

- 新 Logo 任务从简报或参考开始：进入 [Logo 流程](flow-logo.md)的输入、方法与探索步骤。
- 只提取参考或试排字体：直接按 [BD-REF-001](design.md#bd-ref-001)或 [BD-TYPE-001](assets.md#bd-type-001)执行对应研究。
- 已有方向或收到局部反馈：从版本定位与修改步骤进入；材质研究转 [BD-MATERIAL-001](design.md#bd-material-001)。
- 已有选稿且本轮制作正式资产：从 [BD-MASTER-001](assets.md#bd-master-001)进入；已有可用母版时直接按 [BD-EXPORT-001](assets.md#bd-export-001)处理所需导出。

**实际产物：** 按本轮范围交付参考提取、字体样张、候选与选择记录，或可编辑母版、约定资产及使用说明。方向研究与材质展示的交付边界分别沿用对应规则。

**如何验收：** 对应规则检查实际输出；视觉产物按 [BD-QA-001](assets.md#bd-qa-001)验证，阶段记录或正式 release 按 [BD-DELIVERY-001](assets.md#bd-delivery-001)分别交付。

## 二、品牌语言与物料

**从哪里进入：**

- 已选 Logo，需要建立共同用法或手册：进入 [品牌系统流程](flow-system.md)，按 [BD-SYSTEM-001](system.md#bd-system-001)处理本次所需规则。
- 已有品牌规范，只制作或修改物料：直接按 [BD-APPLICATION-001](system.md#bd-application-001)消费现有参数、资产和真实文案。仅当本轮交付包含手册，或改变了手册中的用法时，处理对应手册内容。
- 已有选稿，但本次正式资产或所选应用缺少所需母版、字标或格式：先返回第一段相应的制作或导出步骤，补齐后继续当前应用。源文件类型与重建边界沿用 [BD-MASTER-001](assets.md#bd-master-001)，展示研究沿用其阶段规则。

**实际产物：** 按范围形成品牌手册、Agent 可读规则与参数映射，或可编辑物料、独立内容数据及实际预览；所需辅助图形随对应用途交付。单份物料任务按该物料的产物范围完成。

**如何验收：** 品牌语言按 [BD-SYSTEM-001](system.md#bd-system-001)用真实应用核对；物料按 [BD-APPLICATION-001](system.md#bd-application-001)验收；实际证据和交付状态继续沿用 [BD-QA-001](assets.md#bd-qa-001)与 [BD-DELIVERY-001](assets.md#bd-delivery-001)。

## 三、开发视觉交接

**从哪里进入：** 已有品牌资产与视觉规则，需要交给开发使用时，明确目标平台和本次场景，进入 [开发视觉交接流程](flow-handoff.md)，按 [BD-HANDOFF-001](handoff.md#bd-handoff-001)处理。现有资料足以支持本轮交接时直接开始；缺项影响当前映射时，只返回前两段补齐对应部分。

**实际产物：** 按目标平台交付视觉规则、tokens 与格式映射、字体加载和 fallback、资产映射、约定的组件视觉与状态示例。业务需求、页面导航、API 与产品代码实现按 [交接范围](flow-logo.md#handoff)交给对应任务。

**如何验收：** 按 [BD-HANDOFF-001](handoff.md#bd-handoff-001)核对实际目标平台上的配置、资源与示例；共同的证据和交付状态沿用 [BD-QA-001](assets.md#bd-qa-001)与 [BD-DELIVERY-001](assets.md#bd-delivery-001)。

## 修改后回到哪里

按 [BD-EDIT-001](design.md#bd-edit-001)确定本轮改变项，返回负责该项的制作步骤；沿实际参数与资产引用更新受影响的导出、物料、手册或平台映射。受影响验证及旧证据处理按 [BD-QA-001](assets.md#bd-qa-001)执行，其余已确认成果继续沿用。
