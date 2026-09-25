# Logo 执行流程

根据已有成果从相应步骤开始。只做局部任务时执行对应步骤及受影响的验证；规则目录见 [catalog](00-catalog.md)。

| 步骤 | 行动与依据 | 停止或继续条件 |
| --- | --- | --- |
| 1. 整理输入 | 按 [BD-INPUT-001](design.md#bd-input-001)记录简报与约定范围 | 已知信息足以做当前阶段就继续；缺项只影响后续阶段时先完成独立工作 |
| 2. 选择方法 | 按 [BD-REF-001](design.md#bd-ref-001)检索风格；名称承担识别时按 [BD-TYPE-001](assets.md#bd-type-001)试排 | 记录选择理由及参考角色，允许从简报建立新方法 |
| 3. 探索方向 | 按 [BD-CONCEPT-001](design.md#bd-concept-001)制作实际候选，使用 [Prompt 模式](../libraries/prompts/INDEX.md) | 候选应在结构或意象上可比较；方向差异不足先修正 |
| 4. 反馈与选择 | 按 [BD-EDIT-001](design.md#bd-edit-001)定位版本，记录选中与修改变量 | 依已有选择或自主授权继续；无法定位要修改的版本时询问 |
| 5. 制作源文件 | 按 [BD-MASTER-001](assets.md#bd-master-001)建立母版与正式字标 | 可编辑、可解析、可渲染；材质研究按 [BD-MATERIAL-001](design.md#bd-material-001)独立处理 |
| 6. 导出与应用 | 按 [BD-EXPORT-001](assets.md#bd-export-001)落实矩阵 | 每项承诺有对应文件；共享标志和字体来源 |
| 7. 检查与交付 | 按 [BD-QA-001](assets.md#bd-qa-001)、[BD-DELIVERY-001](assets.md#bd-delivery-001) | 先修当前缺陷再交付；明确未完成范围 |

## 最小工作记录

格式可为 Markdown 或 JSON，保持可解析、能定位即可：

- brief：名称、业务含义、受众、用途、约束、已确认选择、待定事项。
- exploration：方向 ID、版本、输出文件、构思、工具/构造方式、完整提示词、参考与角色。
- selection：当前稿及来源、造型/字体/配色/材质的确定状态、反馈、修改与保持项、决策依据。
- delivery：实际用途矩阵、母版与导出映射、验证结果和限制。

模板字段用于填写真实任务内容，不代表每个用户都要回答一份新问卷；没有生成图像的确定性向量路线记录构造脚本，不伪造生图 Prompt。

<a id="handoff"></a>
## 交接范围

需要品牌语言与物料时进入 [品牌系统流程](flow-system.md)；需要开发视觉规范和消费示例时进入 [开发视觉交接流程](flow-handoff.md)。各阶段的进入点、产物和验收见 [阶段导航](flow-stages.md)，只执行本轮约定部分。

业务需求、页面导航、API 与产品代码实现由对应任务承接。独立视觉示例与实际产品接入的验证边界按 [BD-HANDOFF-001](handoff.md#bd-handoff-001)执行。
