import React from 'react';
import { mergeStyles, type IStyle } from '@fluentui/react';
import type { FooterProps } from '../types';
import { colors } from '../tokens/tokens';

/** A sticky footer region (free-form children) — e.g. for dialog/panel actions. */
export const Footer: React.FC<FooterProps> = ({ sticky = true, align = 'right', className, children }) => {
  const justify = align === 'left' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end';
  const cls = mergeStyles(
    {
      display: 'flex',
      alignItems: 'center',
      justifyContent: justify,
      gap: 8,
      padding: '12px 24px',
      borderTop: `1px solid ${colors.borderNeutral}`,
      background: colors.surface,
      ...(sticky ? { position: 'sticky', bottom: 0, zIndex: 1 } : {}),
    } as IStyle,
    className,
  );
  return <div className={cls}>{children}</div>;
};

export default Footer;
