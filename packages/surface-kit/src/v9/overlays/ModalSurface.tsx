import React from 'react';
import { Dialog, DialogSurface, Text, tokens } from '@fluentui/react-components';
import type { ModalSurfaceProps } from '../types';
import { dialogWidthPx, MODAL_AUTOSIZE_MIN_WIDTH } from '../../core/sizePresets';

/** A generic modal (Fluent v9 `Dialog`) — title + content + optional footer; lighter than FormDialogSurface. */
export const ModalSurface: React.FC<ModalSurfaceProps> = ({
  isOpen,
  onDismiss,
  title,
  size,
  width,
  isBlocking = true,
  autoSize,
  footer,
  className,
  children,
}) => {
  const sizing: React.CSSProperties = autoSize
    ? { width: 'auto', minWidth: MODAL_AUTOSIZE_MIN_WIDTH, maxWidth: '100%' }
    : { maxWidth: '95vw', width: `${dialogWidthPx({ width, size })}px` };

  return (
    <Dialog
      open={isOpen}
      modalType={isBlocking ? 'modal' : 'non-modal'}
      onOpenChange={(_e, data) => {
        if (!data.open) onDismiss?.();
      }}
    >
      <DialogSurface className={className} style={{ ...sizing, padding: 0 }}>
        {title && (
          <div style={{ padding: '16px 20px 0' }}>
            <Text weight="semibold" size={500}>
              {title}
            </Text>
          </div>
        )}
        <div style={{ padding: 20 }}>{children}</div>
        {footer && (
          <div
            style={{
              borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
              padding: '12px 20px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            {footer}
          </div>
        )}
      </DialogSurface>
    </Dialog>
  );
};

export default ModalSurface;
