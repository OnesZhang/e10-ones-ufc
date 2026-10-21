
const ATTRS = {
  text: 'data-ufc-text',
  label: 'data-ufc-label',
  input: 'data-ufc-input',
  show: 'data-ufc-show',
  ifReadonly: 'data-ufc-if-readonly',
  ifEdit: 'data-ufc-if-edit',
  ifRequired: 'data-ufc-if-required',
  ifHidden: 'data-ufc-if-hidden'
};

const formatValue = (value, format) => {
  if (value === undefined || value === null || value === '') return '';
  if (!format) return String(value);
  const num = Number(String(value).replace(/,/g, ''));
  if (format === 'money') return isNaN(num) ? String(value) : '¥' + num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (format === 'number') return isNaN(num) ? String(value) : num.toLocaleString('zh-CN');
  if (format === 'percent') return isNaN(num) ? String(value) : (num * 100).toFixed(2) + '%';
  return String(value);
};

const getRow = (el) => el.getAttribute('data-ufc-row') || undefined;

export function createBindings(root, bridge) {
  const ctx = bridge.ctx;
  let observer = null;
  let timer = null;
  let disposed = false;
  const boundFields = Object.create(null);
  const boundInputs = new WeakSet();

  const safeAttr = (name, rowId) => {
    try { return ctx.attr(name, rowId); } catch (e) { return { readOnly: true, required: false, hidden: true, editable: false, raw: null }; }
  };

  const safeText = (name, rowId) => {
    try { return ctx.text(name, rowId); } catch (e) { return ''; }
  };

  const setHidden = (el, hidden) => {
    if (hidden) el.setAttribute('hidden', 'hidden');
    else el.removeAttribute('hidden');
  };

  const updateText = (el) => {
    const field = el.getAttribute(ATTRS.text);
    const rowId = getRow(el);
    const empty = el.getAttribute('data-ufc-empty');
    const format = el.getAttribute('data-ufc-format');
    const value = formatValue(safeText(field, rowId), format);
    el.textContent = value || empty || '';
  };

  const updateLabel = (el) => {
    const field = el.getAttribute(ATTRS.label);
    try { el.textContent = ctx.label(field) || field; } catch (e) { el.textContent = field; }
  };

  const updateInput = (el) => {
    const field = el.getAttribute(ATTRS.input);
    const rowId = getRow(el);
    const attr = safeAttr(field, rowId);
    const raw = (() => { try { return ctx.get(field, rowId); } catch (e) { return ''; } })();
    el.disabled = !!(attr.readOnly || attr.hidden || ctx.mode === 'readonly' || ctx.mode === 'print');
    // Shadow DOM 下 document.activeElement 是宿主，不是内部 input；必须用 getRootNode().activeElement
    const rootNode = el.getRootNode ? el.getRootNode() : document;
    const active = (rootNode && rootNode.activeElement) || document.activeElement;
    if (active !== el) {
      el.value = raw === undefined || raw === null ? '' : String(raw);
    }
    if (!boundInputs.has(el)) {
      boundInputs.add(el);
      const write = () => {
        if (el.disabled) return;
        try { ctx.set(field, el.value, { rowId }); } catch (e) { ctx.error(e); }
      };
      if (el.hasAttribute('data-ufc-live')) {
        let t = null;
        el.addEventListener('input', () => {
          clearTimeout(t);
          t = setTimeout(write, 300);
        });
      }
      el.addEventListener('change', write);
    }
  };

  const updateState = (el) => {
    const show = el.getAttribute(ATTRS.show);
    if (show) { setHidden(el, safeAttr(show, getRow(el)).hidden); return; }
    const ro = el.getAttribute(ATTRS.ifReadonly);
    if (ro) { setHidden(el, !safeAttr(ro, getRow(el)).readOnly); return; }
    const edit = el.getAttribute(ATTRS.ifEdit);
    if (edit) { setHidden(el, !safeAttr(edit, getRow(el)).editable); return; }
    const req = el.getAttribute(ATTRS.ifRequired);
    if (req) { setHidden(el, !safeAttr(req, getRow(el)).required); return; }
    const hid = el.getAttribute(ATTRS.ifHidden);
    if (hid) { setHidden(el, !safeAttr(hid, getRow(el)).hidden); }
  };

  const all = () => root.querySelectorAll(
    [ATTRS.text, ATTRS.label, ATTRS.input, ATTRS.show, ATTRS.ifReadonly, ATTRS.ifEdit, ATTRS.ifRequired, ATTRS.ifHidden]
      .map((a) => '[' + a + ']').join(',')
  );

  const refresh = () => {
    if (disposed || !root) return;
    const nodes = all();
    nodes.forEach((el) => {
      if (el.hasAttribute(ATTRS.text)) updateText(el);
      if (el.hasAttribute(ATTRS.label)) updateLabel(el);
      if (el.hasAttribute(ATTRS.input)) updateInput(el);
      updateState(el);
    });
  };

  const bindFieldEvents = () => {
    const names = Object.create(null);
    all().forEach((el) => {
      Object.keys(ATTRS).forEach((key) => {
        const field = el.getAttribute(ATTRS[key]);
        if (field) names[field] = true;
      });
    });
    Object.keys(names).forEach((field) => {
      if (boundFields[field]) return;
      boundFields[field] = true;
      try { ctx.on(field, refresh, { linkage: true }); } catch (e) { /* noop */ }
      try { ctx.onAttr(field, refresh); } catch (e) { /* noop */ }
    });
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      refresh();
      bindFieldEvents();
    }, 50);
  };

  const start = () => {
    refresh();
    bindFieldEvents();
    ctx.onReady(() => { refresh(); bindFieldEvents(); });
    ctx.onLinkage(() => refresh());
    ctx.onRelate(() => refresh());
    ctx.onSave(() => refresh());
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(schedule);
      observer.observe(root, { childList: true, subtree: true });
    }
    bridge.setRefresh(refresh);
  };

  const destroy = () => {
    disposed = true;
    clearTimeout(timer);
    if (observer) { observer.disconnect(); observer = null; }
    bridge.setRefresh(null);
  };

  return { start, refresh, destroy };
}
