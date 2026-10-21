import React, { useEffect, useRef } from 'react';
import { renderStatic } from './coms/renderer';
import { DEFAULT_CONFIG } from './coms/defaults';

const MDesign = (props) => {
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

MDesign.defaultProps = { config: DEFAULT_CONFIG };

MDesign.flow = {
  defaultProps: { config: DEFAULT_CONFIG }
};

MDesign.defaultOpts = {
  operationBtns: true,
  mask: true,
  layoutSizes: {
    mgl: { w: 4, h: 200, adaptive: true }
  }
};

export default MDesign;
