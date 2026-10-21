import React, { useEffect, useRef } from 'react';
import { createBridge } from './coms/bridge';
import { createBindings } from './coms/bindings';
import { renderLive, updateLiveHeight } from './coms/renderer';

const MView = (props) => {
  const hostRef = useRef(null);
  const config = props.config || {};
  const code = config.ufcCode || '';
  const runScript = config.ufcRunScript !== false;
  const debug = !!config.ufcDebug;

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const bridge = createBridge(props, config);
    const renderer = renderLive(hostRef.current, code, bridge, {
      runScript,
      debug,
      createBindings,
      onResize: (height) => updateLiveHeight(hostRef.current, height)
    });
    return () => {
      renderer.destroy();
      bridge.destroy();
    };
  }, [code, runScript, debug]);

  const className = ['cusStyleCls', 'ufc-host', 'ones-ufc', 'weapp-form-style__content', props.className].filter(Boolean).join(' ');
  return <div ref={hostRef} className={className} data-ones="Ones" />;
};

export default MView;
