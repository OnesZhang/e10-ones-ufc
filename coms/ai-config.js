import React, { useState } from 'react';
import { buildPrompt, PROMPT_VERSION } from './prompt';

const EMPTY = { need: '', fields: '', template: '' };

const label = { display: 'block', margin: '8px 0 4px', color: '#4e5969', fontSize: 12, lineHeight: '20px' };
const area = { width: '100%', boxSizing: 'border-box', border: '1px solid #c9cdd4', borderRadius: 4, padding: '6px 8px', fontSize: 12, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', color: '#1d2129', background: '#fff' };
const hint = { color: '#86909c', fontSize: 12, lineHeight: 1.6, marginBottom: 4 };
const summary = { cursor: 'pointer', color: '#4e5969', fontSize: 12, lineHeight: '22px', userSelect: 'none' };
const row = { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 };

export default function OnesAiConfig(props) {
  let rawValue = props && props.value;
  if (typeof rawValue === 'string') {
    try { rawValue = JSON.parse(rawValue); } catch (e) { rawValue = null; }
  }
  const value = rawValue && typeof rawValue === 'object' ? Object.assign({}, EMPTY, rawValue) : Object.assign({}, EMPTY);
  const [prompt, setPrompt] = useState('');
  const [tip, setTip] = useState('');
  const disabled = !!(props && props.disabled);

  const update = (patch) => {
    if (disabled || !props || !props.onChange) return;
    props.onChange(Object.assign({}, value, patch));
  };

  const copyText = (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => setTip('已复制，去 AI 粘贴即可'))
          .catch(() => setTip('复制失败，请手动全选提示词复制'));
        return;
      }
    } catch (e) { /* noop */ }
    setTip('复制失败，请手动全选提示词复制');
  };

  const generate = () => {
    if (disabled) return;
    const text = buildPrompt(value);
    setPrompt(text);
    copyText(text);
  };

  return (
    <details>
      <summary style={summary}>展开 AI 提示词生成 <span style={{ color: '#86909c' }}>（填写需求后生成并复制，粘给任意 AI 即可）</span></summary>
      <div style={{ paddingTop: 4 }}>
        <div style={hint}>流程：填写需求 → 生成并复制提示词 → 粘贴给 AI → 把 AI 返回的 HTML 粘到上方「组件代码」。</div>

        <label style={label}>需求描述（给 AI）</label>
        <textarea style={{ ...area, height: 84 }} value={value.need || ''} disabled={disabled} onChange={(e) => update({ need: e.target.value })} placeholder="例：做一个客户信息卡片，显示客户名称/金额；备注可编辑；只读时隐藏按钮；点按钮把客户名称写到备注。" />

        <label style={label}>字段清单（可选；标题 | dataKey | 类型，每行一个）</label>
        <textarea style={{ ...area, height: 64 }} value={value.fields || ''} disabled={disabled} onChange={(e) => update({ fields: e.target.value })} placeholder={'例：客户名称 | khxm | 文本\n金额 | je | 数字'} />

        <div style={row}>
          <button type="button" className="ui-btn ui-btn-primary ui-btn-middle ui-btn-inline" disabled={disabled} onClick={generate}>生成并复制提示词</button>
          <button type="button" className="ui-btn ui-btn-default ui-btn-middle ui-btn-inline" disabled={disabled || !prompt} onClick={() => copyText(prompt)}>再复制一次</button>
          <button type="button" className="ui-btn ui-btn-default ui-btn-middle ui-btn-inline" disabled={disabled} onClick={() => { setPrompt(''); setTip(''); }}>清空</button>
          {tip ? <span style={{ color: tip.indexOf('失败') >= 0 ? '#f53f3f' : '#00b42a', fontSize: 12 }}>{tip}</span> : null}
        </div>

        {prompt ? (
          <details style={{ marginTop: 10 }}>
            <summary style={summary}>提示词预览（复制失败时可手动全选） <span style={{ color: '#86909c' }}>v{PROMPT_VERSION}</span></summary>
            <textarea style={{ ...area, height: 160, marginTop: 6 }} readOnly value={prompt} />
          </details>
        ) : null}

        <details style={{ marginTop: 8 }}>
          <summary style={summary}>提示词模板覆盖（留空用内置模板）</summary>
          <textarea style={{ ...area, height: 100, marginTop: 6 }} value={value.template || ''} disabled={disabled} onChange={(e) => update({ template: e.target.value })} placeholder="只在特殊场景使用；支持 {{need}} / {{fields}} / {{version}} 占位符" />
        </details>
      </div>
    </details>
  );
}
