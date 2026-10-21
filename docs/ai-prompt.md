# AI 提示词

组件配置里的「AI 生成（高级）」内置一份提示词模板。管理员填写需求、可选字段清单后，点「生成并复制提示词」，把生成的文本粘给任意 AI；AI 返回一个 HTML 代码块，再粘回「组件代码」。

提示词包含：

- 运行环境：Shadow DOM、单文件、无构建、无 iframe/eval、IIFE；
- 字段规则：只读/必填/隐藏、初始值、防死循环、明细 rowId；
- `ctx` API 速查；
- `data-ufc-*` 速查；
- 输出格式：只输出一个 HTML 代码块，静态骨架 + 样式 + 脚本；
- 自检清单。

内置模板在 `coms/prompt.js`，随组件版本维护。AI 面板默认折叠，避免占用侧栏。

注意事项：

- AI 代码里禁止用 `document.querySelector` 查组件内部节点，必须用 `ctx.root.querySelector`。
- 固定选项写值前先确认字段认 valueKey 还是 selectionId。
- 设计器不执行脚本；交互要在预览/运行态验证。
