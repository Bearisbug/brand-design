# 品牌 Prompt 模式

按本次变量选择模式。以下为通用自然语言模板，使用前填入真实名称、用途和约束；工具专用参数以当前接口为准。行为要求分别由 [BD-CONCEPT-001](../../references/design.md#bd-concept-001)、[BD-EDIT-001](../../references/design.md#bd-edit-001)与 [BD-MATERIAL-001](../../references/design.md#bd-material-001)定义。

| 模式 | 填写内容 | 参考角色 |
| --- | --- | --- |
| 新构思 | 品牌/受众/用途；一个核心动作；标志类型；形状关系；输出与比较尺寸 | 仅借构思关系或形状语法，主体结构重新设计 |
| 轮廓细化 | 已选稿 ID；具体部位与可观察缺陷；允许修改项；保持项 | 已选自有稿为轮廓依据 |
| 材质/配色 | 已选母版；表面、反射、光照、配色变量；目标画幅与背景 | 母版控制形状，风格图控制表现 |
| 字标 | 准确拼写、语言、字形角色、改字位置、阅读宽度 | 外部字样仅提供字形关系，真实字体另行选择 |
| 应用展示 | 权威母版、颜色/字体、真实用途和内容、输出尺寸 | 应用参考只控制布局，标志来源固定 |

## 提交结构

```text
Task mode: {{mode}}
Brand and purpose: {{actual brief}}
Concept or selected artwork: {{new construction idea OR exact own-brand version}}
References: {{each input path with its single stated role}}
Change: {{permitted variables and observable target}}
Keep: {{accepted geometry, parts, wording and other decisions}}
Output: {{actual use, canvas/background and comparison sizes}}
Review focus: {{what must be compared with the input after generation}}
```

只保留适用字段。提交后保存实际完整文本、实际工具、输入文件与输出版本；根据结果记录失败和修正。没有运行的模板写明未执行。具体视觉语法从命中的风格包 `PROMPTS.md` 取用，不把不同工具的负面提示或参考图参数混在通用模板中。
