# 复古精密拟物 · Prompt

按 [STYLE.md](STYLE.md) 的适用条件使用。以下为根据样本编写的自然语言模板，不是作者原始提示词，也没有实测生成结果。用户已确定的轮廓、品牌名和修改范围优先。

## 概念与材质

提交前替换全部字段。参考图分别指定为构思、材质或呈现参考；第三方作品不能直接作为新品牌的轮廓母版。

```text
Create an original brand mark for {{brand}}, a product for {{purpose}}.
Represent {{product-relevant concept}} as one carefully constructed miniature
{{device or object}}. Its primary silhouette is {{new silhouette description}}.
Organize it into {{main body}}, {{functional focal component}} and
{{essential supporting components}}. Make their front-to-back relationships clear.
Assign {{material}} to each named component. Use a coherent key light from
{{direction}}, restrained edge highlights and contact shadows between parts.
Add only {{necessary controls, texture or readout}}. Preserve a strong visual
hierarchy so the main form remains recognizable at {{target display size}}.
Palette: {{brand palette}}. Exact text: {{required text or none}}.
Presentation: {{standalone mark or app-icon concept}} on {{background}}.
Use the reference for material separation and construction quality; invent this
brand's geometry. Exclude unrelated props and copied third-party logo outlines.
```

检查主体是否只是通用设备；若缺少品牌差异，先改构思与轮廓。不要靠更复杂的螺钉、发光或金属纹理掩盖问题。

## 定向改材质

```text
Use {{approved version}} as the shape reference for {{brand}}.
Preserve {{named silhouette, parts, gaps, lettering and relative positions}}.
Change only {{specific material or lighting property}} to {{observable target}}.
Return {{requested view}} for direct comparison with the approved version.
```

该模板仅用于已经获得用户授权的自有方案。实际输出仍需对照几何与文字，不得仅凭 Prompt 中写了 preserve 就判定保持成功。
