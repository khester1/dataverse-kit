import React from 'react';
import { tokens } from '@fluentui/react-components';
import type { FooterProps } from '../types';

/** A sticky footer region (free-form children, Fluent v9) — e.g. for dialog/panel actions. */
export const Footer: React.FC<FooterProps> = ({ sticky = true, align = 'right', className, children }) => {
  const justify = align === 'left' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end';
  const rootStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: justify,
    gap: 8,
    padding: '12px 24px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    ...(sticky ? { position: 'sticky', bottom: 0, zIndex: 1 } : {}),
  };
  return (
    <div className={className} style={rootStyle}>
      {children}
    </div>
  );
};

export default Footer;
