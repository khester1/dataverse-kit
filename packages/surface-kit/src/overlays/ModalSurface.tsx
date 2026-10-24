import React from 'react';
import { Modal, mergeStyleSets } from '@fluentui/react';
import type { ModalSurfaceProps } from '../types';
import { dialogWidthPx, MODAL_AUTOSIZE_MIN_WIDTH } from '../core/sizePresets';
import { colors, typography } from '../tokens/tokens';

/** A generic modal (Fluent v8 Modal) — title + content + optional footer; lighter than FormDialogSurface. */
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
  const main = autoSize
    ? { width: 'auto', minWidth: MODAL_AUTOSIZE_MIN_WIDTH, maxWidth: '100%' }
    : { maxWidth: '95vw', width: `${dialogWidthPx({ width, size })}px` };

  const styles = mergeStyleSets({
    title: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      fontFamily: typography.fontFamilySemibold,
      color: colors.textPrimary,
      padding: '16px 20px 0',
    },
    content: { padding: 20 },
  });

  // The footer is rendered bare — an ActionBar footer supplies its own full-width
  // divider (borderTop) + padding, so a wrapper here would double the divider line.
  return (
    <Modal isOpen={isOpen} onDismiss={onDismiss} isBlocking={isBlocking} className={className} styles={{ main }}>
      {title && <div className={styles.title}>{title}</div>}
      <div className={styles.content}>{children}</div>
      {footer}
    </Modal>
  );
};

export default ModalSurface;
