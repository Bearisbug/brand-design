# 手写与连笔字标 · Prompt

按 [STYLE.md](STYLE.md) 判断适用范围。以下为研究者依据样本编写的自然语言模板，未实测，不是原作者提示词。提交前替换全部字段，用户已确定的选择与当前任务范围优先。

## 新构思探索

```text
Design an original handwritten wordmark spelling exactly {{brand name}} for {{purpose}}. Convey {{personality}} through {{stroke weight and contrast}}, {{slant}}, and {{connection rhythm}}. Give emphasis to {{one initial, terminal or repeated-letter feature}} while keeping every letter unmistakable. Set {{baseline and height rhythm}} with open counters and deliberate spacing. Use {{brand color}} on {{background}}. The references guide handwriting rhythm only; do not trace their glyphs or substitute this name into an existing wordmark. Show {{required view and target size}}. Any generated lettering is a concept to be checked and rebuilt as editable artwork.
```

## 已选版本定向修改

仅在用户要求局部修改且已有自有品牌选定稿时使用：

```text
Use {{approved own-brand artwork}} as the geometry and lettering reference.
Preserve {{approved silhouette, letter sequence, composition and palette}}.
Change only {{requested variable}} to achieve {{observable correction}}.
Use {{style reference}} only for {{permitted line, rhythm or hierarchy property}}.
Show the revised artwork beside the approved version at {{comparison size}}.
Do not replace the established concept unless the user requested a new concept.
```

## 结果核对

- 逐字符核对名称、大小写与相邻字母误读。
- 检查长尾、点、环圈和下伸笔画是否相互干扰。
- 检查短词与长词的可读性，不将生成文字作为正式字体文件。
- 实际对照输入与输出；提示词中的“保持”不代表已经保持。
- 生成文字与几何仅作为探索，正式资产另经可编辑母版制作及对应用途验证。
