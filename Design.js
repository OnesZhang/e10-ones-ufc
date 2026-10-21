import React, { useEffect, useRef } from 'react';
import { renderStatic } from './coms/renderer';
import { DEFAULT_CONFIG, DEFAULT_LAYOUT } from './coms/defaults';

const Design = (props) => {
  const hostRef = useRef(null);
  const config = props.config || DEFAULT_CONFIG;
  const code = config.ufcCode || '';

  useEffect(() => {
    if (!hostRef.current) return undefined;
    const renderer = renderStatic(hostRef.current, code);
    return () => renderer.destroy();
  }, [code]);

  const className = ['cusStyleCls', 'ufc-host', 'ones-ufc', 'weapp-form-style__content', props.className].filter(Boolean).join(' ');
  return <div ref={hostRef} className={className} data-ones="Ones" />;
};

Design.defaultProps = { config: DEFAULT_CONFIG };

Design.flow = {
  defaultProps: { config: DEFAULT_CONFIG }
};

Design.defaultOpts = {
  operationBtns: true,
  mask: false,
  layoutSizes: DEFAULT_LAYOUT.layoutSizes
};

export default Design;
