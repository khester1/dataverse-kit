import React from 'react';
import { mergeStyles, DefaultButton, PrimaryButton, ActionButton, type IStyle } from '@fluentui/react';
import type { ActionBarProps, SurfaceActionButton } from '../types';
import { colors } from '../tokens/tokens';

function renderButton(b: SurfaceActionButton) {
  const common = {
    text: b.label,
    disabled: b.disabled,
    onClick: b.onClick,
    iconProps: b.iconName ? { iconName: b.iconName } : undefined,
  };
  // key passed directly (not spread) per React 18.
  if (b.appearance === 'primary') return <PrimaryButton key={b.id} {...common} />;
  if (b.appearance === 'subtle') return <ActionButton key={b.id} {...common} />;
  return <DefaultButton key={b.id} {...common} />;
}

/** A sticky footer bar of action buttons, with optional left-aligned buttons. */
export const ActionBar: React.FC<ActionBarProps> = ({
  buttons,
  alignment = 'right',
  inverted = false,
  sticky = true,
  className,
}) => {
  const justify = alignment === 'left' ? 'flex-start' : alignment === 'center' ? 'center' : 'flex-end';
  const visible = buttons.filter((b) => !b.hidden);
  const left = visible.filter((b) => b.position === 'left');
  const right = visible.filter((b) => b.position !== 'left');
  // `inverted` flips the right cluster so the primary action leads (leftmost).
  const rightOrdered = inverted ? [...right].reverse() : right;

  const cls = mergeStyles(
    {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '12px 24px',
      borderTop: `1px solid ${colors.borderNeutral}`,
      background: colors.surface,
      ...(sticky ? { position: 'sticky', bottom: 0, zIndex: 1 } : {}),
    } as IStyle,
    className,
  );

  // Left buttons pin to the start; the right cluster takes the remaining space and
  // honors `alignment` within it — so left/center/right are visibly distinct even when
  // a left-positioned button is present.
  return (
    <div className={cls}>
      {left.length > 0 && <div style={{ display: 'flex', gap: 8 }}>{left.map(renderButton)}</div>}
      <div style={{ display: 'flex', flex: 1, gap: 8, justifyContent: justify }}>{rightOrdered.map(renderButton)}</div>
    </div>
  );
};

export default ActionBar;
