import React from 'react';
import { mergeStyleSets, type IStyle } from '@fluentui/react';
import type { FieldRowProps } from '../types';
import { colors, typography } from '../tokens/tokens';
import { fieldRowStyle } from '../responsive/builders';

// Ported + extended from reusable-components/src/ui/primitives/FieldRow.tsx — adds
// `labelPosition` and a phone-stacking @480 rule on top of the same 130px label grid.

/** A two-column "Label : control" row. The control goes in `children` (right column). */
export const FieldRow: React.FC<FieldRowProps> = ({
  label,
  required,
  fullWidth,
  labelWidth = '130px',
  labelPosition = 'beside',
  className,
  children,
}) => {
  const styles = mergeStyleSets({
    // The beside layout IS the shared responsive builder (130px label grid + @480
    // stack) — no hand-written breakpoint here.
    rowBeside: fieldRowStyle(labelWidth, 'media') as IStyle,
    rowAbove: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: 2,
      minHeight: 38,
    },
    label: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
      fontFamily: typography.fontFamily,
      lineHeight: '1.3',
      wordBreak: 'break-word',
    },
    required: { color: colors.danger, marginLeft: 2, fontWeight: typography.fontWeight.semibold },
    full: { gridColumn: '1 / -1' },
  });

  const cls = [
    labelPosition === 'above' ? styles.rowAbove : styles.rowBeside,
    fullWidth ? styles.full : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls}>
      {label != null && (
        <span className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </span>
      )}
      {children}
    </div>
  );
};

export default FieldRow;
