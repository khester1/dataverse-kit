import React from 'react';
import { mergeStyleSets } from '@fluentui/react';
import type { FormHeaderProps } from '../types';
import { colors, typography } from '../tokens/tokens';

/** Dynamics form header: persona + title/status (left), KPI/header fields (right). */
export const FormHeader: React.FC<FormHeaderProps> = ({
  title,
  subtitle,
  status,
  titleColor,
  subtitleColor,
  persona,
  headerFields,
  actions,
  className,
}) => {
  const styles = mergeStyleSets({
    root: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '12px 24px',
      borderBottom: `1px solid ${colors.borderNeutral}`,
      background: colors.surface,
    },
    main: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
    titleRow: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
    title: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      fontFamily: typography.fontFamilySemibold,
      color: titleColor || colors.textPrimary,
      lineHeight: '1.3',
    },
    status: { fontSize: typography.fontSize.smPlus, color: colors.textSecondary },
    subtitle: { fontSize: typography.fontSize.smPlus, color: subtitleColor || colors.textSecondary, marginTop: 2 },
    // Right cluster: Dynamics header-field summary tiles (value over label) separated by
    // hairline dividers — mirrors form-runtime HeaderShell's SummaryTile.
    right: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', minWidth: 0 },
    field: { display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 200, minWidth: 0 },
    fieldValue: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    fieldLabel: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    divider: { width: 1, height: 24, background: colors.borderNeutral, margin: '0 12px', flexShrink: 0 },
  });

  const hasFields = headerFields != null && headerFields.length > 0;

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <div className={styles.main}>
        {persona}
        <div>
          <div className={styles.titleRow}>
            {title != null && <span className={styles.title}>{title}</span>}
            {status != null && <span className={styles.status}>{status}</span>}
          </div>
          {subtitle != null && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
      </div>
      {(hasFields || actions != null) && (
        <div className={styles.right}>
          {hasFields &&
            headerFields!.map((f, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className={styles.divider} aria-hidden />}
                <div className={styles.field}>
                  <div
                    className={styles.fieldValue}
                    title={typeof f.value === 'string' ? f.value : undefined}
                  >
                    {f.value}
                  </div>
                  <div className={styles.fieldLabel}>{f.label}</div>
                </div>
              </React.Fragment>
            ))}
          {actions != null && (
            <div style={{ marginLeft: hasFields ? 12 : 0 }}>{actions}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default FormHeader;
