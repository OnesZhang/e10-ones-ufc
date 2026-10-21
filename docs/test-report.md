# 测试记录（脱敏）

环境：E10 目标环境，表单设计器 + 表单运行页。

## 已通过

| 项 | 结果 |
|---|---|
| 空白表单组件创建、构建、导入 | 通过 |
| 单文件 HTML/CSS 在 Shadow DOM 渲染 | 通过 |
| `data-ufc-text` 跟随字段值 | 通过 |
| `data-ufc-input` 输入、blur 写回 | 通过 |
| 脚本 `ctx.set` 写字段 | 通过 |
| 固定选项显示名映射 | 通过 |
| 固定选项 valueKey 写值并驱动原生下拉 | 通过 |
| 字段只读：按钮隐藏、`ctx.set` 拒绝 | 通过 |
| 明细表 `ctx.rows`、明细字段带 rowId 写入 | 通过 |
| 明细字段缺 rowId 抛错 | 通过 |
| 保存前校验阻断 + 正常保存放行 | 通过 |
| 配置保存/重开 | 通过 |
| hook 去重（保存/字段/属性/动作） | 通过 |
| AI 提示词生成 | 通过 |

## 未完成

| 项 | 原因 |
|---|---|
| 打印模板 | 目标环境没有可用打印模板/数据入口 |
| 整表单只读 | 没有只读数据/审批中任务场景 |
| 真实移动端 H5 | 预览页未触发 MView |
| 超大配置体积 | 未压测 |
| 多实例压力 | 未压测 |

## 已修复的问题

- Shadow DOM 下 `document.activeElement` 是宿主，导致输入被旧值覆盖；改用 `getRootNode().activeElement`。
- AI 代码用 `document.querySelector` 查不到 Shadow DOM 节点；改用 `ctx.root.querySelector`。
- 明细字段不带 rowId 会写所有行；桥接层强制 rowId。
- hook 重挂载重复注册；全局注册表去重。
