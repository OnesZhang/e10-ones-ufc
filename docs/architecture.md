# 架构

Ones 万能组件是 **E10 表单组件**，不是 EB 页面组件。它从表单设计器的组件管理创建，运行在表单页面里，因此可以拿到表单上下文；页面设计器不是它的使用场景。

## 运行时

```
Config（4 项配置）
  → View / MView
  → renderer：归一化单文件 HTML → Shadow DOM → 样式/脚本 → 声明式绑定
  → bridge：WeFormSDK / formStore 适配 → ctx
  → 字段值变化 / 属性变化 / 联动 → 重新计算绑定
```

- 设计态 `Design / MDesign` 只静态渲染 HTML/CSS，不执行脚本，便于管理员看骨架。
- 运行态脚本包在 IIFE 里，仅注入 `ctx`，不污染 `window`。
- 打印态（`viewType=printPage`）不执行脚本，保留静态骨架和绑定值。
- 只读态（`getEditStatus()=false`）`ctx.set` 被拦截。

## 字段桥接

优先取 `window.WeFormSDK.getWeFormInstance()`；不可用时降级 `props.formStore`。

- 字段解析：`dataKey` → `title` → `fieldId`；主表 mark `field{fieldId}`，明细 `field{fieldId}_{rowId}`。
- 只读/必填/隐藏：`getFieldAttr`（1/2/3/4/5）+ `listFieldInfo`。
- 选项显示：`specialObj[].name` 为空时，从字段 `options` 按 `selectionId/valueKey` 映射。
- 选项写值：固定选项可能是 valueKey（`0/1/2`）或 selectionId，以字段实际契约为准；写入后检查原生控件。
- 明细字段必须带 `rowId`；缺失直接抛错，避免误写所有行。
- 表单级 hook（保存前/保存后/联动/字段变化）用 `window.__ONES_HOOKS__` 按 `formId+fieldId` 去重，避免重挂载累积。

## 配置

1. `ufcCode`：单文件 HTML。
2. `ufcRunScript`：是否执行 `<script>`。
3. `ufcDebug`：错误/字段提示。
4. `ufcAi`：需求 + 字段清单 + 提示词模板；默认折叠。

## 已知边界

- 组件自身没有 dataKey；需要持久化组件状态时，用隐藏的多行文本辅助字段。
- 整表单只读、打印模板、真实移动端 H5 仍需目标环境验证。
- 配置里执行 JS 的信任边界等同平台「页面源码 / 表单 ecode」。正式发布前按安全流程确认直出或沙箱策略。
