export const ONES_VERSION = '1.0.0';

export const DEMO_CODE = `<div class="ufc-root ones-demo" data-ones="Ones">
  <div class="ones-card">
    <div class="ones-head"><span class="ones-dot"></span><span class="ones-title">Ones 示例卡片</span><span class="ones-sub">字段实时联动</span></div>
    <div class="ones-grid">
      <div class="ones-item"><span class="ones-label">客户名称</span><span class="ones-value" data-ufc-text="客户名称" data-ufc-empty="—"></span></div>
      <div class="ones-item"><span class="ones-label">金额</span><span class="ones-value" data-ufc-text="金额" data-ufc-format="money" data-ufc-empty="—"></span></div>
      <div class="ones-item ones-item--full"><span class="ones-label">备注</span><input class="ones-input" data-ufc-input="备注" placeholder="输入后写回字段" /></div>
    </div>
    <div class="ones-actions"><button class="ones-btn" data-ufc-if-edit="客户名称">把客户名称写入备注</button><span class="ones-hint" data-ufc-if-edit="客户名称">只读时按钮自动隐藏</span></div>
  </div>
</div>
<style>
.ufc-root{font:inherit;color:inherit;padding:2px 0}
.ones-card{border-radius:8px;padding:12px 16px 14px;background:linear-gradient(135deg,#eef4ff 0%,#f7f9fc 60%,#fbfcff 100%)}
.ones-head{display:flex;align-items:baseline;gap:8px;margin-bottom:10px}
.ones-dot{width:6px;height:6px;border-radius:50%;background:#165dff;flex:none}
.ones-title{font-size:14px;font-weight:600;color:#1d2129}
.ones-sub{font-size:12px;color:#86909c}
.ones-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 18px}
.ones-item{display:flex;align-items:center;gap:8px;min-height:28px;border-bottom:1px dashed rgba(134,144,156,.18)}
.ones-item--full{grid-column:1/-1}
.ones-label{color:#86909c;font-size:12px;width:64px;flex:none}
.ones-value{color:#1d2129;font-size:13px;min-height:18px}
.ones-input{flex:1;border:1px solid #d9dfe7;border-radius:6px;padding:5px 9px;font-size:13px;color:#1d2129;background:#fff;outline:none}
.ones-input:focus{border-color:#165dff;box-shadow:0 0 0 2px rgba(22,93,255,.08)}
.ones-actions{display:flex;align-items:center;gap:10px;margin-top:12px}
.ones-btn{padding:5px 14px;border:none;border-radius:6px;background:#165dff;color:#fff;font-size:13px;cursor:pointer}
.ones-btn:hover{background:#0e4bd6}
.ones-hint{color:#86909c;font-size:12px}
@media print{.ones-btn,.ones-hint{display:none}.ones-card{background:#fff}.ones-input{border:none;padding:0}}
</style>
<script>
(function(){'use strict';var b=ctx.root.querySelector('.ones-btn');if(!b)return;b.addEventListener('click',function(){var v=ctx.text('客户名称');if(!v){ctx.toast('客户名称为空');return}ctx.set('备注',v);ctx.toast('已写入备注')})})();
</script>`;

export const DEFAULT_CONFIG = {
  ufcCode: DEMO_CODE,
  ufcRunScript: true,
  ufcDebug: false,
  ufcAi: { need: '', fields: '', template: '' }
};

export const DEFAULT_LAYOUT = {
  layoutSizes: {
    gl: { w: 6, h: 24 },
    mgl: { adaptive: true, h: 200 }
  }
};
