import React from 'react';
import { Dialog, DialogSurface, Button, Text, tokens } from '@fluentui/react-components';
import { Dismiss20Regular } from '@fluentui/react-icons';
import type { FormDialogSurfaceProps } from '../types';
import { dialogWidthCss, dialogHeightCss } from '../../core/sizePresets';

// The Fluent v9 counterpart of the v8 FormDialogSurface (a `<Modal>`): a controlled
// `<Dialog>` + `<DialogSurface>` sized from the SHARED sizing scalars (dialogWidthCss /
// dialogHeightCss — the same 1200 / 95vh contract the v8 skin and the codegen use), with a
// custom header (title/subheader | counter + close), a scrolling content region, and a
// sticky footer. Content is rendered directly in DialogSurface (padding managed here) so the
// flex-column scroll layout matches the v8 Modal main/scrollableContent.

/**
 * Full Dynamics form-dialog (Fluent v9 `Dialog`). Default width 1200 (lg), height 95vh.
 * `onDismiss` is the close affordance — when omitted, no close button renders. `isBlocking`
 * maps to the dialog `modalType` (`modal` vs `non-modal`).
 */
export const FormDialogSurface: React.FC<FormDialogSurfaceProps> = ({
  isOpen,
  onDismiss,
  title,
  subheader,
  size,
  width,
  height,
  isBlocking = true,
  recordCounter,
  footer,
  className,
  children,
}) => {
  const widthCss = dialogWidthCss({ width, size });
  const heightCss = dialogHeightCss(height);
  const showHeader = Boolean(title) || Boolean(recordCounter) || Boolean(onDismiss);

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 20px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  };
  const counterStyle: React.CSSProperties = { fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3 };

  return (
    <Dialog
      open={isOpen}
      modalType={isBlocking ? 'modal' : 'non-modal'}
      onOpenChange={(_e, data) => {
        if (!data.open) onDismiss?.();
      }}
    >
      <DialogSurface
        className={className}
        style={{
          maxWidth: '95vw',
          width: widthCss,
          height: heightCss,
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        }}
      >
        {showHeader && (
          <div style={headerStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {title && (
                <Text weight="semibold" size={400}>
                  {title}
                </Text>
              )}
              {subheader && (
                <span style={{ fontSize: tokens.fontSizeBase200, color: tokens.colorNeutralForeground3, marginTop: 2 }}>
                  {subheader}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {recordCounter && (
                <span style={counterStyle}>
                  {recordCounter.current} of {recordCounter.total}
                </span>
              )}
              {onDismiss && (
                <Button appearance="subtle" aria-label="Close" icon={<Dismiss20Regular />} onClick={onDismiss} />
              )}
            </div>
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 20 }}>{children}</div>
        {footer && (
          <div style={{ borderTop: `1px solid ${tokens.colorNeutralStroke2}`, padding: '12px 20px' }}>{footer}</div>
        )}
      </DialogSurface>
    </Dialog>
  );
};

export default FormDialogSurface;
