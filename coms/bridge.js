
const LAYOUT_TYPES = [
  'MultiColumn', 'Container', 'ColumnPanel', 'Tabs', 'Tab', 'Group', 'Frame',
  'SubLayout', 'Row', 'Column', 'DataTable', 'DetailTable'
];

const isLayoutType = (value) => LAYOUT_TYPES.indexOf(String(value || '')) >= 0;

const safe = (fn, fallback) => {
  try {
    const v = fn();
    return v === undefined ? fallback : v;
  } catch (e) {
    return fallback;
  }
};

const getSdk = () => {
  if (window.formSdk) return window.formSdk;
  if (window.WeFormSDK && window.WeFormSDK.getWeFormInstance) {
    return safe(() => window.WeFormSDK.getWeFormInstance(), null);
  }
  return null;
};

const normalizeOptionMap = (options) => {
  const map = Object.create(null);
  (Array.isArray(options) ? options : []).forEach((o) => {
    if (!o) return;
    const name = o.name || o.label || o.content || o.text || '';
    [o.selectionId, o.valueKey, o.id, o.value, o.optionId].forEach((key) => {
      if (key !== undefined && key !== null && key !== '') map[String(key)] = name;
    });
  });
  return map;
};

const toValueInfo = (value) => {
  if (value === null || value === undefined || value === '') return { value: '' };
  if (Array.isArray(value)) {
    if (value.length && value.every((v) => v && typeof v === 'object' && (v.id !== undefined || v.targetId !== undefined))) {
      return { specialObj: value.map((v) => ({ id: v.id !== undefined ? v.id : v.targetId, name: v.name || '', type: v.type, data: v.data })) };
    }
    return { value: value.join(',') };
  }
  if (typeof value === 'object') {
    if (value.value !== undefined || value.specialObj !== undefined || value.longitude !== undefined || value.latitude !== undefined) return value;
    return { value: String(value) };
  }
  return { value: String(value) };
};

const toStoreData = (valueInfo) => {
  if (valueInfo && valueInfo.specialObj) {
    return {
      dataOptions: valueInfo.specialObj.map((o) => ({
        optionId: String(o.id),
        content: o.name || '',
        targetId: String(o.id),
        optionObj: o.data || {}
      }))
    };
  }
  if (valueInfo && valueInfo.value !== undefined) return { content: String(valueInfo.value) };
  return valueInfo || {};
};

export function createBridge(props, config) {
  const formStore = props.formStore;
  let sdk = getSdk();
  const formProps = props.formProps || safe(() => formStore && formStore.getFormProps && formStore.getFormProps(), {}) || {};
  const viewType = formProps.viewType || safe(() => formStore && formStore.getFormProps && formStore.getFormProps().viewType, '') || '';
  const editStatus = safe(() => formStore && formStore.getEditStatus && formStore.getEditStatus(), true);
  const terminal = safe(() => formStore && formStore.getTerminalType && formStore.getTerminalType(), formProps.isMobile ? 'MOBILE' : 'PC');
  const mode = viewType === 'printPage'
    ? 'print'
    : (editStatus === false ? 'readonly' : (!sdk && !formStore ? 'detached' : 'edit'));

  const state = {
    destroyed: false,
    ready: false,
    fields: [],
    fieldsMap: Object.create(null),
    layoutCache: Object.create(null),
    optionCache: Object.create(null),
    readyCallbacks: [],
    destroyCallbacks: [],
    refresh: null,
    root: null,
    error: null
  };

  // 全局 hook 注册表：避免组件重挂载时重复注册表单级监听（实测会重复触发）
  const hookRegistry = (() => {
    const w = window;
    w.__ONES_HOOKS__ = w.__ONES_HOOKS__ || {
      save: {}, saveRegistered: {}, saveOwner: {},
      action: {}, actionRegistered: {}, actionOwner: {},
      field: {}, fieldRegistered: {},
      attr: {}, attrRegistered: {}
    };
    return w.__ONES_HOOKS__;
  })();
  const instanceKey = [
    (formProps && formProps.formId) || (config && config.formId) || '',
    (config && config.fieldId) || props.weId || props.id || 'ufc'
  ].join(':');
  const localHooks = { saveCb: null, actions: {}, fieldCbs: [], attrCbs: [] };

  const warn = (...args) => {
    if (config && config.ufcDebug) console.warn('[Ones]', ...args);
  };

  const getLayout = (fieldId) => {
    if (!fieldId) return null;
    if (state.layoutCache[fieldId]) return state.layoutCache[fieldId];
    const layout = safe(() => formStore && formStore.getWidgetLayout && formStore.getWidgetLayout(fieldId), null);
    state.layoutCache[fieldId] = layout;
    return layout;
  };

  const isDetailField = (field) => !!(field && field.kind === 'detailField');

  const fieldKeyValues = (field) => {
    if (!field) return [];
    return [field.dataKey, field.title, field.name, field.fieldId].filter(Boolean).map(String);
  };

  const registerField = (field) => {
    fieldKeyValues(field).forEach((key) => {
      if (!state.fieldsMap[key]) state.fieldsMap[key] = field;
    });
  };

  const normalizeField = (f) => {
    if (!f) return null;
    return {
      fieldId: f.fieldId || f.subFormId || '',
      dataKey: f.dataKey || '',
      title: f.title || f.name || '',
      name: f.name || f.title || '',
      type: f.type || '',
      componentKey: f.componentKey || '',
      subFormId: f.subFormId || '',
      kind: (f.componentKey === 'DataTable' || f.type === 'DetailTable')
        ? 'table'
        : ((isLayoutType(f.componentKey) || isLayoutType(f.type))
          ? 'layout'
          : (f.subFormId ? 'detailField' : 'field')),
      display: f.display !== false,
      readOnly: f.readOnly === true,
      required: f.required === true,
      disableEdit: f.disableEdit === true
    };
  };

  const refreshFields = () => {
    let list = [];
    if (sdk && sdk.listFieldInfo) list = safe(() => sdk.listFieldInfo(), []) || [];
    if ((!Array.isArray(list) || !list.length) && formStore && formStore.getWidgetLayoutMap) {
      const map = safe(() => formStore.getWidgetLayoutMap(), null);
      if (map && map.forEach) {
        map.forEach((v) => { if (v) list.push(v); });
      }
    }
    const fields = (Array.isArray(list) ? list : [])
      .map(normalizeField)
      .filter((f) => f && f.fieldId)
      .filter((f) => f.kind === 'table' || !!f.dataKey)
      .filter((f) => f.kind === 'table' || f.kind === 'detailField' || (!isLayoutType(f.componentKey) && !isLayoutType(f.type)))
      .filter((f) => f.kind !== 'layout');
    state.fields = fields;
    state.fieldsMap = Object.create(null);
    fields.forEach(registerField);
  };

  const findField = (name) => {
    if (name === undefined || name === null || name === '') return null;
    const key = String(name);
    if (state.fieldsMap[key]) return state.fieldsMap[key];
    refreshFields();
    if (state.fieldsMap[key]) return state.fieldsMap[key];
    const lower = key.toLowerCase();
    const found = state.fields.find((f) => String(f.dataKey).toLowerCase() === lower || String(f.title).toLowerCase() === lower);
    if (found) { registerField(found); return found; }
    return null;
  };

  const resolve = (name, rowId) => {
    if (name === undefined || name === null || name === '') throw new Error('字段名为空');
    const raw = String(name);
    if (/^field\d+/.test(raw)) {
      if (/_\d+$/.test(raw) || /_/.test(raw)) return raw;
      return rowId ? raw + '_' + rowId : raw;
    }
    const field = findField(raw);
    if (field) {
      if (field.kind === 'table') return 'field' + (field.subFormId || field.fieldId);
      if (isDetailField(field) && !rowId) {
        throw new Error('明细字段 [' + field.title + '] 必须传 rowId');
      }
      const mark = 'field' + field.fieldId;
      return rowId ? mark + '_' + rowId : mark;
    }
    if (sdk && sdk.convertFieldNameToId) {
      const converted = safe(() => sdk.convertFieldNameToId(raw, 'main'), '');
      if (converted) return rowId && !/_/.test(converted) ? converted + '_' + rowId : converted;
    }
    if (/^\d+$/.test(raw)) return 'field' + raw + (rowId ? '_' + rowId : '');
    throw new Error('找不到字段：' + raw);
  };

  const resolveAny = (name) => {
    const field = findField(name);
    if (field) return 'field' + field.fieldId;
    return safe(() => resolve(name), '');
  };

  const getField = (name) => findField(name);
  const getMark = (name, rowId) => resolve(name, rowId);

  const getAttr = (name, rowId) => {
    const field = findField(name);
    const mark = resolve(name, rowId);
    const raw = sdk && sdk.getFieldAttr ? safe(() => sdk.getFieldAttr(mark), null) : null;
    const layout = field ? getLayout(field.fieldId) : null;
    const readOnly = raw === 1 || (field && field.readOnly) || (layout && layout.readOnly === true);
    const required = (field && field.required) || raw === 3 || (layout && layout.required === true);
    const hidden = raw === 4 || raw === 5 || (field && field.display === false) || (layout && layout.display === false);
    return {
      raw,
      readOnly: !!readOnly,
      required: !!required,
      hidden: !!hidden,
      editable: !readOnly && !hidden,
      disableEdit: !!(layout && layout.disableEdit)
    };
  };

  const getRaw = (name, rowId) => {
    const mark = resolve(name, rowId);
    if (sdk && sdk.getFieldValue) return safe(() => sdk.getFieldValue(mark), '');
    const field = findField(name);
    const targetId = field ? field.fieldId : mark.replace(/^field/, '').split('_')[0];
    return safe(() => formStore && formStore.getFieldSimpleValue && formStore.getFieldSimpleValue(targetId, rowId), '') || '';
  };

  const getObj = (name, rowId) => {
    const mark = resolve(name, rowId);
    if (sdk && sdk.getFieldObj) return safe(() => sdk.getFieldObj(mark), {}) || {};
    const field = findField(name);
    return safe(() => formStore && formStore.getWidgetData && formStore.getWidgetData(field && field.fieldId, rowId), {}) || {};
  };

  const getOptionMap = (name, rowId) => {
    const field = findField(name);
    const mark = resolve(name, rowId);
    const cacheKey = field ? field.fieldId : mark;
    if (state.optionCache[cacheKey]) return state.optionCache[cacheKey];
    let options = [];
    if (sdk && sdk.getFieldCom) {
      const com = safe(() => sdk.getFieldCom(mark), null);
      options = (com && com.config && com.config.options) || [];
    }
    if ((!options || !options.length) && field && formStore && formStore.getWidgetLayout) {
      const layout = getLayout(field.fieldId);
      options = (layout && layout.options) || [];
    }
    const map = normalizeOptionMap(options);
    state.optionCache[cacheKey] = map;
    return map;
  };

  const text = (name, rowId) => {
    const obj = getObj(name, rowId);
    const map = getOptionMap(name, rowId);
    if (obj && Array.isArray(obj.specialObj) && obj.specialObj.length) {
      const names = obj.specialObj.map((o) => {
        if (!o) return '';
        if (o.name) return o.name;
        return map[String(o.id || o.targetId)] || String(o.id || o.targetId || '');
      }).filter(Boolean);
      if (names.length) return names.join('、');
    }
    if (obj && obj.value !== undefined && obj.value !== null && obj.value !== '') {
      return map[String(obj.value)] !== undefined ? map[String(obj.value)] : String(obj.value);
    }
    const raw = getRaw(name, rowId);
    if (raw === undefined || raw === null) return '';
    if (map[String(raw)] !== undefined) return map[String(raw)];
    return String(raw);
  };

  const label = (name) => {
    const field = findField(name);
    return (field && field.title) || '';
  };

  const set = (name, value, opts) => {
    opts = opts || {};
    if (state.destroyed) return false;
    if (mode === 'readonly' || mode === 'print' || mode === 'detached') {
      warn('当前模式不可写：' + mode);
      return false;
    }
    const field = findField(name);
    const attr = getAttr(name, opts.rowId);
    if (attr.readOnly) {
      warn('字段只读，已忽略写入：' + (field ? field.title : name));
      return false;
    }
    if (isDetailField(field) && !opts.rowId) {
      throw new Error('明细字段 [' + field.title + '] 写值必须传 rowId');
    }
    const valueInfo = toValueInfo(value);
    const mark = resolve(name, opts.rowId);
    let writeConfig = {};
    if (opts.linkage === false) {
      writeConfig = { dataLinkage: false, viewLinkage: false, optionLinkage: false, dataValidate: false, jsApiChange: false };
    } else if (opts.silent) {
      writeConfig.jsApiChange = false;
      writeConfig.dataValidate = false;
    }
    if (opts.validate === false) writeConfig.dataValidate = false;
    if (sdk && sdk.changeFieldValue) {
      safe(() => sdk.changeFieldValue(mark, valueInfo, writeConfig), null);
      if (state.refresh) state.refresh();
      return true;
    }
    if (formStore && formStore.setFieldValue) {
      const data = toStoreData(valueInfo);
      safe(() => formStore.setFieldValue({ fieldId: field ? field.fieldId : mark, data, rowId: opts.rowId, subFormId: field && field.subFormId }), null);
      if (state.refresh) state.refresh();
      return true;
    }
    warn('没有可用的写值 API');
    return false;
  };

  const setObj = (name, valueInfo, opts) => {
    opts = opts || {};
    if (valueInfo && valueInfo.specialObj) {
      return set(name, { specialObj: valueInfo.specialObj }, opts);
    }
    return set(name, valueInfo, opts);
  };

  const rows = (table) => {
    const field = findField(table);
    if (!field) throw new Error('找不到明细表：' + table);
    const mark = field.subFormId ? 'field' + field.subFormId : 'field' + field.fieldId;
    if (sdk && sdk.getDetailData) return safe(() => sdk.getDetailData(mark), []) || [];
    if (formStore && formStore.getSubFormData) return safe(() => formStore.getSubFormData(field.subFormId || field.fieldId), []) || [];
    return [];
  };

  const splitNames = (name) => String(name).split(',').map((s) => s.trim()).filter(Boolean);

  const on = (name, cb, opts) => {
    if (state.destroyed) return;
    const names = Array.isArray(name) ? name : splitNames(name);
    names.forEach((n) => {
      const field = findField(n);
      const mark = resolveAny(n);
      if (!mark || !sdk) return;
      const key = instanceKey + '|' + mark;
      const entry = hookRegistry.field[key] || (hookRegistry.field[key] = { callbacks: [] });
      entry.callbacks.push(cb);
      localHooks.fieldCbs.push({ key, cb });
      if (!hookRegistry.fieldRegistered[key]) {
        hookRegistry.fieldRegistered[key] = true;
        const changeOpts = opts && opts.linkage ? { scope: window.WeFormSDK && window.WeFormSDK.CHANGE_EVENT_SCOPE } : undefined;
        const handler = (data) => {
          const current = hookRegistry.field[key];
          if (!current) return;
          current.callbacks.slice().forEach((fn) => { try { fn(data); } catch (e) { /* noop */ } });
        };
        if (field && isDetailField(field) && !/_\d+$/.test(mark) && sdk.bindDetailFieldChangeEvent) {
          safe(() => sdk.bindDetailFieldChangeEvent('field' + field.fieldId, handler, changeOpts), null);
        } else if (sdk.bindFieldChangeEvent) {
          safe(() => sdk.bindFieldChangeEvent(mark, handler, changeOpts), null);
        }
      }
    });
  };

  const onAttr = (name, cb) => {
    if (state.destroyed || !sdk || !sdk.bindFieldAttrChangeEvent) return;
    const names = Array.isArray(name) ? name : splitNames(name);
    names.forEach((n) => {
      const mark = resolveAny(n);
      if (!mark) return;
      const key = instanceKey + '|' + mark;
      const entry = hookRegistry.attr[key] || (hookRegistry.attr[key] = { callbacks: [] });
      entry.callbacks.push(cb);
      localHooks.attrCbs.push({ key, cb });
      if (!hookRegistry.attrRegistered[key]) {
        hookRegistry.attrRegistered[key] = true;
        safe(() => sdk.bindFieldAttrChangeEvent(mark, (data) => {
          const current = hookRegistry.attr[key];
          if (!current) return;
          current.callbacks.slice().forEach((fn) => { try { fn(data); } catch (e) { /* noop */ } });
        }), null);
      }
    });
  };

  const onReady = (cb) => {
    if (state.ready) { setTimeout(() => cb(), 0); return; }
    state.readyCallbacks.push(cb);
  };

  const onDestroy = (cb) => {
    if (typeof cb === 'function') state.destroyCallbacks.push(cb);
  };

  const onBeforeSave = (cb) => {
    if (!sdk || !sdk.registerCheckEvent || !window.WeFormSDK) return;
    hookRegistry.save[instanceKey] = cb;
    localHooks.saveCb = cb;
    if (hookRegistry.saveRegistered[instanceKey]) return;
    hookRegistry.saveRegistered[instanceKey] = true;
    safe(() => sdk.registerCheckEvent(window.WeFormSDK.OPER_SAVE, (success, fail) => {
      const current = hookRegistry.save[instanceKey];
      if (!current) { success(); return; }
      const done = (r) => {
        if (r === false) { fail({ msg: '组件校验未通过' }); return; }
        if (typeof r === 'string') { fail({ msg: r }); return; }
        if (r && r.ok === false) { fail({ msg: r.msg || '组件校验未通过' }); return; }
        success();
      };
      try {
        const r = current();
        if (r && typeof r.then === 'function') r.then(done).catch(() => fail({ msg: '组件校验异常' }));
        else done(r);
      } catch (e) {
        fail({ msg: e && e.message ? e.message : '组件校验异常' });
      }
    }), null);
  };

  const registerActionOnce = (type, cb) => {
    if (!sdk || !sdk.registerAction || !window.WeFormSDK) return;
    const key = type + '|' + instanceKey;
    hookRegistry.action[key] = cb;
    localHooks.actions[key] = cb;
    if (hookRegistry.actionRegistered[key]) return;
    hookRegistry.actionRegistered[key] = true;
    safe(() => sdk.registerAction(type, (data) => {
      const current = hookRegistry.action[key];
      if (current) { try { current(data); } catch (e) { /* noop */ } }
    }), null);
  };

  const onSave = (cb) => registerActionOnce(window.WeFormSDK && window.WeFormSDK.ACTION_FORM_SAVE, cb);
  const onLinkage = (cb) => registerActionOnce(window.WeFormSDK && window.WeFormSDK.ACTION_DATA_LINKAGE, cb);
  const onRelate = (cb) => registerActionOnce(window.WeFormSDK && window.WeFormSDK.ACTION_DATA_RELATE, cb);

  const toast = (msg, type) => {
    try {
      if (window.weappUi && window.weappUi.Message) {
        const fn = type === 'success' ? window.weappUi.Message.success : window.weappUi.Message.info;
        if (fn) { fn(String(msg)); return; }
      }
    } catch (e) { /* noop */ }
    console.log('[Ones toast]', msg);
  };

  const confirm = (opts) => {
    const message = typeof opts === 'string' ? opts : (opts && opts.message) || '确认？';
    if (typeof window.confirm === 'function') return Promise.resolve(window.confirm(message));
    return Promise.resolve(false);
  };

  const request = (options, extra) => {
    if (typeof props.request === 'function') return props.request(options, extra);
    return Promise.reject(new Error('当前上下文没有 request'));
  };

  const ready = new Promise((resolveReady) => {
    let attempts = 0;
    const timer = setInterval(() => {
      if (state.destroyed) { clearInterval(timer); return; }
      if (!sdk) sdk = getSdk();
      attempts += 1;
      let fieldsReady = false;
      if (sdk && sdk.listFieldInfo) {
        const list = safe(() => sdk.listFieldInfo(), []) || [];
        fieldsReady = Array.isArray(list) && list.length > 0;
      } else if (formStore) {
        fieldsReady = true;
      }
      if (fieldsReady || attempts > 100) {
        clearInterval(timer);
        refreshFields();
        state.ready = true;
        resolveReady();
        const callbacks = state.readyCallbacks.slice();
        state.readyCallbacks = [];
        callbacks.forEach((cb) => { try { cb(); } catch (e) { warn('onReady error', e); } });
      }
    }, 50);
  });

  const ctx = {
    version: '0.1.0',
    mode,
    isMobile: terminal === 'MOBILE' || formProps.isMobile === true,
    debug: !!(config && config.ufcDebug),
    root: null,
    fields: () => state.fields.slice(),
    field: (name, rowId) => resolve(name, rowId),
    get: getRaw,
    obj: getObj,
    text,
    label,
    set,
    setObj,
    attr: getAttr,
    on,
    onAttr,
    onReady,
    onBeforeSave,
    onSave,
    onLinkage,
    onRelate,
    rows,
    request,
    toast,
    confirm,
    refresh: () => { if (state.refresh) state.refresh(); },
    onDestroy,
    raw: () => ({ sdk, formStore }),
    log: (...args) => { if (config && config.ufcDebug) console.log('[Ones]', ...args); },
    error: (e) => { state.error = e; if (config && config.ufcDebug) console.error('[Ones]', e); }
  };

  const bridge = {
    ctx,
    state,
    ready,
    getSdk: () => sdk,
    getFormStore: () => formStore,
    getFields: () => state.fields.slice(),
    refreshFields,
    setRoot: (root) => { state.root = root; ctx.root = root; },
    setRefresh: (fn) => { state.refresh = fn; },
    destroy: () => {
      if (state.destroyed) return;
      state.destroyed = true;
      if (localHooks.saveCb && hookRegistry.save[instanceKey] === localHooks.saveCb) delete hookRegistry.save[instanceKey];
      Object.keys(localHooks.actions).forEach((key) => {
        if (hookRegistry.action[key] === localHooks.actions[key]) delete hookRegistry.action[key];
      });
      localHooks.fieldCbs.forEach(({ key, cb }) => {
        const entry = hookRegistry.field[key];
        if (entry) entry.callbacks = entry.callbacks.filter((fn) => fn !== cb);
      });
      localHooks.attrCbs.forEach(({ key, cb }) => {
        const entry = hookRegistry.attr[key];
        if (entry) entry.callbacks = entry.callbacks.filter((fn) => fn !== cb);
      });
      state.destroyCallbacks.forEach((cb) => { try { cb(); } catch (e) { /* noop */ } });
      state.destroyCallbacks = [];
    }
  };

  refreshFields();
  return bridge;
}
