import OnesAiConfig from './coms/ai-config';
import { DEFAULT_CONFIG } from './coms/defaults';

const CONFIG_HELP = '单文件 HTML：可写 <div>…</div><style>…</style><script>…</script>；也可粘完整 HTML 文档，组件会剥离 html/head/body 后在 Shadow DOM 渲染。';
const SCRIPT_HELP = '关闭后只渲染 HTML/CSS，不执行 <script>，用于安全审查、打印兜底或排障。';
const DEBUG_HELP = '开启后显示脚本错误和字段解析告警；正式使用建议关闭。';

const Config = () => Promise.resolve({
  items: {
    ufcCode: {
      label: '组件代码（单文件 HTML）',
      itemType: 'TEXTAREA',
      style: { width: '100%', height: '320px', marginBottom: '30px' },
      resizable: false,
      labelHelp: CONFIG_HELP
    },
    ufcRunScript: {
      label: '运行 JS',
      itemType: 'SWITCH',
      labelHelp: SCRIPT_HELP
    },
    ufcDebug: {
      label: '调试模式',
      itemType: 'SWITCH',
      labelHelp: DEBUG_HELP
    },
    ufcAi: {
      label: 'AI 生成（高级）',
      itemType: 'CUSTOM',
      customRender: OnesAiConfig,
      labelSpan: 24
    }
  },
  defaultConfig: DEFAULT_CONFIG,
  formatFormDatas: (_data) => ({ ..._data })
});

export default Config;
