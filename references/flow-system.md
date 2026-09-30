# 品牌语言与应用流程

适用于已有选稿后的品牌规范和物料制作。新 Logo 构思走 [Logo 流程](flow-logo.md)；现有选稿无需重做已完成阶段。运行时与当前用户要求优先。

1. **确认本次范围与资产。** 读取原始简报和实际选稿，按 [BD-INPUT-001](design.md#bd-input-001)、[BD-EDIT-001](design.md#bd-edit-001)定位需要继承和改变的内容。只补影响当前交付的缺失信息；本轮所需正式源或格式不存在时，先按 [BD-MASTER-001](assets.md#bd-master-001)或 [BD-EXPORT-001](assets.md#bd-export-001)补齐对应部分，再继续当前物料。
2. **建立共同用法。** 按 [BD-SYSTEM-001](system.md#bd-system-001)整理颜色与排版角色、Logo 使用、参数来源及所需辅助图形；字体按 [BD-TYPE-001](assets.md#bd-type-001)核对。宣传物料与产品界面要共用参数时，按 [BD-TOKEN-001](system.md#bd-token-001)把这些角色写进 tokens，应用库的 `brand.json` 从 tokens 生成。
3. **先做一份真实应用。** 按 [BD-APPLICATION-001](system.md#bd-application-001)选择用途和模板，以真实文案暴露语言、布局与图形关系问题，再扩展本次约定的其余物料。
4. **按范围同步规则与实例。** 本轮交付包含手册，或改变了手册中的用法时，将实际采用的参数、组合与错误示例编入对应手册和 Agent 规则，逐项回指当前文件；仅改一份物料时沿用有效规范，更新该物料及受影响记录。应用库的输入/输出格式见 [合同](../libraries/applications/contract.md)。
5. **验证与交付。** 按 [BD-QA-001](assets.md#bd-qa-001)分别记录机械、浏览器和目检结果，按 [BD-DELIVERY-001](assets.md#bd-delivery-001)交付约定阶段。模板有真实实例后才能陈述对应范围的验证，不能概括未测试的品牌、语言、画布或平台。

涉及 tokens 接入、组件视觉或平台配置时进入 [开发视觉交接流程](flow-handoff.md)，先明确目标平台与交付深度。品牌物料任务不自动包含产品页面、业务流程、API、印刷或发布。
