// 单文件 HTML 渲染器：归一化 -> Shadow DOM -> 样式/脚本 -> 声明式绑定。

const BASE_STYLE = `
:host { display: block; }
.ufc-root { font: inherit; color: inherit; min-height: 1px; }
[hidden] { display: none !important; }
.ufc-error { margin: 4px 0; padding: 6px 10px; border: 1px solid #f53f3f; border-radius: 4px; background: #fff2f0; color: #cb2634; font-size: 12px; white-space: pre-wrap; }
.ufc-design-badge { position: absolute; right: 6px; top: 4px; z-index: 2; padding: 1px 6px; border-radius: 3px; background: rgba(22,93,255,.08); color: #165dff; font-size: 11px; pointer-events: none; }
.ufc-empty-tip { padding: 16px; border: 1px dashed #c9cdd4; border-radius: 6px; color: #86909c; font-size: 13px; text-align: center; }
`;

const normalize = (code) => {
  const raw = String(code || '').trim();
  if (!raw) return { html: '', styles: [], links: [], scripts: [] };
  const isDoc = /<!doctype|<html[\s>]/i.test(raw);
  let doc;
  if (isDoc) {
    doc = new DOMParser().parseFromString(raw, 'text/html');
  } else {
    doc = document.implementation.createHTMLDocument('');
    const wrap = doc.createElement('div');
    wrap.innerHTML = raw;
    doc.body.appendChild(wrap);
  }
  const styles = Array.from(doc.querySelectorAll('style')).map((el) => el.textContent || '');
  const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map((el) => el.getAttribute('href') || '').filter(Boolean);
  const scripts = Array.from(doc.querySelectorAll('script')).map((el) => ({ src: el.getAttribute('src') || '', text: el.textContent || '' }));
  Array.from(doc.querySelectorAll('style,link[rel="stylesheet"],script')).forEach((el) => el.parentNode && el.parentNode.removeChild(el));
  const html = isDoc ? (doc.body ? doc.body.innerHTML : '') : (doc.body && doc.body.firstElementChild ? doc.body.firstElementChild.innerHTML : '');
  return { html, styles, links, scripts };
};

const loadScript = (doc, script, timeout) => new Promise((resolve) => {
  if (!script.src) { resolve(); return; }
  const el = doc.createElement('script');
  el.src = script.src;
  el.async = false;
  let done = false;
  const finish = () => { if (done) return; done = true; resolve(); };
  el.onload = finish;
  el.onerror = finish;
  setTimeout(finish, timeout || 5000);
  (doc.head || doc.documentElement).appendChild(el);
});

const createShadow = (host) => {
  if (!host) return null;
  if (host.shadowRoot) return host.shadowRoot;
  try { return host.attachShadow({ mode: 'open' }); } catch (e) { return null; }
};

const renderShadow = (shadow, html, styles) => {
  if (!shadow) return null;
  shadow.innerHTML = '';
  const base = document.createElement('style');
  base.textContent = BASE_STYLE;
  shadow.appendChild(base);
  const wrapper = document.createElement('div');
  wrapper.className = 'ufc-root';
  wrapper.innerHTML = html || '';
  styles.forEach((css) => {
    const style = document.createElement('style');
    style.textContent = css;
    shadow.appendChild(style);
  });
  shadow.appendChild(wrapper);
  return wrapper;
};

export function renderStatic(host, code, options) {
  options = options || {};
  const shadow = createShadow(host);
  if (!shadow) return { destroy: () => {} };
  const parts = normalize(code);
  shadow.innerHTML = '';
  const base = document.createElement('style');
  base.textContent = BASE_STYLE;
  shadow.appendChild(base);
  const wrapper = document.createElement('div');
  wrapper.className = 'ufc-root';
  wrapper.style.position = 'relative';
  wrapper.innerHTML = parts.html || '';
  if (!parts.html) {
    const tip = document.createElement('div');
    tip.className = 'ufc-empty-tip';
    tip.textContent = '组件代码为空。请在右侧「组件代码」粘贴 AI 生成的单文件 HTML。';
    wrapper.appendChild(tip);
  }
  parts.styles.forEach((css) => {
    const style = document.createElement('style');
    style.textContent = css;
    shadow.appendChild(style);
  });
  shadow.appendChild(wrapper);
  const badge = document.createElement('div');
  badge.className = 'ufc-design-badge';
  badge.textContent = '设计视图 · 脚本不执行';
  wrapper.appendChild(badge);
  if (typeof ResizeObserver !== 'undefined' && options.onResize) {
    const ro = new ResizeObserver(() => options.onResize(wrapper.scrollHeight));
    ro.observe(wrapper);
    return { destroy: () => ro.disconnect() };
  }
  return { destroy: () => {} };
}

export function renderLive(host, code, bridge, options) {
  options = options || {};
  const shadow = createShadow(host);
  if (!shadow) return { destroy: () => {} };
  const parts = normalize(code);
  const wrapper = renderShadow(shadow, parts.html, parts.styles);
  bridge.setRoot(wrapper);
  bridge.ctx.root = wrapper;

  const ownerDoc = host.ownerDocument || document;
  const errors = [];
  const showError = (e) => {
    errors.push(e);
    if (!options.debug) return;
    const box = document.createElement('div');
    box.className = 'ufc-error';
    box.textContent = 'Ones 脚本错误：' + (e && e.message ? e.message : String(e));
    wrapper.insertBefore(box, wrapper.firstChild);
  };

  const run = async () => {
    if (!options.runScript || bridge.ctx.mode === 'design' || bridge.ctx.mode === 'print') return;
    for (let i = 0; i < parts.scripts.length; i += 1) {
      const script = parts.scripts[i];
      try {
        if (script.src) {
          await loadScript(ownerDoc, script, 5000);
        } else if (script.text.trim()) {
          const fn = new Function('ctx', 'console', '"use strict";\n' + script.text);
          fn(bridge.ctx, console);
        }
      } catch (e) {
        showError(e);
      }
    }
  };

  let bindings = null;
  const startBindings = () => {
    if (typeof options.createBindings === 'function') {
      bindings = options.createBindings(wrapper, bridge);
      bindings.start();
    }
  };
  startBindings();
  run();
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      if (options.onResize) options.onResize(wrapper.scrollHeight);
    });
    ro.observe(wrapper);
    return {
      destroy: () => {
        ro.disconnect();
        if (bindings) bindings.destroy();
        shadow.innerHTML = '';
      }
    };
  }
  return {
    destroy: () => {
      if (bindings) bindings.destroy();
      shadow.innerHTML = '';
    }
  };
}

export function updateLiveHeight(host, height) {
  if (!host) return;
  if (height && height > 0) {
    host.style.minHeight = height + 'px';
  } else {
    host.style.minHeight = '';
  }
}
