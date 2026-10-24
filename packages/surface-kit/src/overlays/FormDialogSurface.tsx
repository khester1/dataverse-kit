import React from 'react';
import { Modal, IconButton, mergeStyleSets } from '@fluentui/react';
import type { FormDialogSurfaceProps } from '../types';
import { dialogWidthCss, dialogHeightCss } from '../core/sizePresets';
import { colors, typography } from '../tokens/tokens';

// Extracted from export-engine generateDialogForm (v8 <Modal> branch): the same
// 95vw / ${width}px / 95vh flex-column main + scrollableContent, a header (title +
// subheader | counter + close), a scrolling content region, and a sticky footer.
// Named FormDialogSurface to avoid colliding with Fluent v9's `DialogSurface`.

/**
 * Full Dynamics form-dialog (Fluent v8 Modal). Default width 1200 (lg), height 95vh.
 * `onDismiss` is the close affordance — when omitted, no close button renders, so a
 * blocking dialog without `onDismiss` is intentionally non-dismissible.
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

  const styles = mergeStyleSets({
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '12px 20px',
      borderBottom: `1px solid ${colors.borderNeutral}`,
    },
    headerLeft: { display: 'flex', flexDirection: 'column', minWidth: 0 },
    title: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      fontFamily: typography.fontFamilySemibold,
      color: colors.textPrimary,
    },
    subheader: { fontSize: typography.fontSize.smPlus, color: colors.textSecondary, marginTop: 2 },
    headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
    counter: { fontSize: typography.fontSize.smPlus, color: colors.textSecondary },
    content: { flex: 1, minHeight: 0, overflow: 'auto', padding: 20 },
  });

  const showHeader = Boolean(title) || Boolean(recordCounter) || Boolean(onDismiss);

  return (
    <Modal
      isOpen={isOpen}
      onDismiss={onDismiss}
      isBlocking={isBlocking}
      className={className}
      styles={{
        main: {
          maxWidth: '95vw',
          width: widthCss,
          height: heightCss,
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
        },
        scrollableContent: {
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        },
      }}
    >
      {showHeader && (
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {title && <span className={styles.title}>{title}</span>}
            {subheader && <span className={styles.subheader}>{subheader}</span>}
          </div>
          <div className={styles.headerRight}>
            {recordCounter && (
              <span className={styles.counter}>
                {recordCounter.current} of {recordCounter.total}
              </span>
            )}
            {onDismiss && (
              <IconButton
                iconProps={{ iconName: 'Cancel' }}
                ariaLabel="Close"
                onClick={onDismiss}
                styles={{ root: { color: colors.textSecondary } }}
              />
            )}
          </div>
        </div>
      )}
      <div className={styles.content}>{children}</div>
      {/* Footer rendered bare: an ActionBar supplies its own full-width divider + padding. */}
      {footer}
    </Modal>
  );
};

export default FormDialogSurface;
