import React from 'react';
import { Button, tokens } from '@fluentui/react-components';
import type { ActionBarProps, SurfaceActionButton } from '../types';

function renderButton(b: SurfaceActionButton): React.ReactElement {
  // v9 appearance: primary → primary, subtle → subtle, default → secondary.
  const appearance = b.appearance === 'primary' ? 'primary' : b.appearance === 'subtle' ? 'subtle' : 'secondary';
  return (
    <Button key={b.id} appearance={appearance} icon={b.icon} disabled={b.disabled} onClick={b.onClick}>
      {b.label}
    </Button>
  );
}

/** A sticky footer bar of action buttons (Fluent v9), with optional left-aligned buttons. */
export const ActionBar: React.FC<ActionBarProps> = ({ buttons, alignment = 'right', sticky = true, className }) => {
  const justify = alignment === 'left' ? 'flex-start' : alignment === 'center' ? 'center' : 'flex-end';
  const visible = buttons.filter((b) => !b.hidden);
  const left = visible.filter((b) => b.position === 'left');
  const right = visible.filter((b) => b.position !== 'left');

  const rootStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: left.length ? 'space-between' : justify,
    gap: 8,
    padding: '12px 24px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    ...(sticky ? { position: 'sticky', bottom: 0, zIndex: 1 } : {}),
  };

  return (
    <div className={className} style={rootStyle}>
      {left.length > 0 && <div style={{ display: 'flex', gap: 8 }}>{left.map(renderButton)}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: justify }}>{right.map(renderButton)}</div>
    </div>
  );
};

export default ActionBar;
