import React from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { FieldRowProps } from '../types';
import { ceForm, colors } from '../../tokens';
import { BREAKPOINTS } from '../../responsive/breakpoints';
import { CE_LABEL_ABOVE_BELOW_ROW_WIDTH } from '../../core/ceLayout';
import { useLook } from '../../hooks/useLook';

// A "Label : control" row (Fluent v9). Two looks:
//
// - `default`: the v8 FieldRow's geometry and marker (130px label column, 12px semibold label,
//   semibold `*` 2px after the text, phone-stack at 480px), so a v9 form matches the kit's v8 forms.
// - `ce`: the MEASURED Dynamics CE row (@dataverse-kit/design-tokens `ceForm.field`; evidence in
//   dynamics-ui-kit apps/ce-parity/reference/captures). Beside: a 184px label column whose text is
//   176px wide, the label box 4px down and 30px tall, the control 2px down and 2px short of the
//   right edge. Above: label 2px down and 20px tall, a 4px gap, then the control.
//
// ★ Every row pads 12px on top. Dynamics' first row in a section pads 8, so the SECTION BODY
//   pulls its content up by the difference (`ceFieldRowFirstOffset`), rather than this row keying
//   off `:first-child`, which any wrapper, hidden input or heading in the body would silently break.
// ★ Rows span every column of a grid parent (the v9 Section body is a 12-column grid).
// ★ `labelPosition: 'auto'` flips beside → above with a container query on the row itself, so it
//   follows the SECTION's width (what Dynamics follows), not the viewport. Only 'auto' rows become
//   containers: `container-type: inline-size` zeroes a row's intrinsic width, which would collapse
//   it inside any shrink-to-fit parent. An 'auto' row therefore needs a parent of definite width.

const F = ceForm.field;
// Geometry measured for this component (label rect y+12/h30 and input rect y+10 in a row with 8px
// top padding; 176px label text in a 184px column; input box 2px short of the row's right edge).
// Not tokens: nothing else uses them.
const CE_LABEL_BOX = 30;
const CE_LABEL_OFFSET = 4;
const CE_CONTROL_OFFSET = 2;
const CE_CONTROL_INSET_RIGHT = 2;
const CE_LABEL_TEXT_WIDTH = 176;
const CE_MARKER_GAP = 4;

/**
 * How far a section body must pull its rows up so the first `FieldRow` pads 8px, as Dynamics'
 * first row does, while every row itself pads 12px. `Section look="ce"` applies it; a hand-built
 * body applies `marginTop: -ceFieldRowFirstOffset`.
 */
export const ceFieldRowFirstOffset = F.rowPaddingTop - F.rowPaddingTopFirst;

// Range syntax is exact ("narrower than 340px"); max-width with an epsilon is off by up to a
// LayoutUnit. Griffel passes the string through.
const NARROW = `@container (width < ${CE_LABEL_ABOVE_BELOW_ROW_WIDTH}px)`;

const useStyles = makeStyles({
  // ── shared ──────────────────────────────────────────────────────────────
  // Span every column when placed in a grid (v9 Section's body is repeat(12, 1fr)).
  spanAll: { gridColumn: '1 / -1' },
  // ── ce ──────────────────────────────────────────────────────────────────
  ceRow: {
    paddingTop: `${F.rowPaddingTop}px`,
    minWidth: 0,
  },
  ceContainer: { containerType: 'inline-size' },
  ceGrid: {
    display: 'grid',
    alignItems: 'start',
  },
  // ★ The column template lives in CLASSES, never in an inline style: an inline
  //   grid-template-columns beats the @container rule, so 'auto' never flipped to 'above'
  //   (caught measuring a 306px row in a real browser; jsdom cannot see it). A custom labelWidth
  //   reaches the class through the --sk-label-col custom property.
  ceGridBeside: { gridTemplateColumns: 'var(--sk-label-col) minmax(0, 1fr)' },
  ceGridSingle: { gridTemplateColumns: 'minmax(0, 1fr)' },
  ceLabelBeside: {
    display: 'flex',
    alignItems: 'center',
    minHeight: `${CE_LABEL_BOX}px`,
    marginTop: `${CE_LABEL_OFFSET}px`,
    // 184 − 176: the measured text width. A required marker is allowed into half of it (below).
    paddingRight: `${F.labelColumnWidth - CE_LABEL_TEXT_WIDTH}px`,
  },
  ceLabelAbove: {
    display: 'flex',
    alignItems: 'center',
    marginTop: `${CE_CONTROL_OFFSET}px`,
    minHeight: `${F.labelLineHeight}px`,
  },
  ceControlBeside: {
    marginTop: `${CE_CONTROL_OFFSET}px`,
    marginBottom: `${CE_CONTROL_OFFSET}px`,
    marginRight: `${CE_CONTROL_INSET_RIGHT}px`,
    minWidth: 0,
  },
  ceControlAbove: {
    marginTop: `${F.labelAboveGap}px`,
    marginBottom: `${CE_CONTROL_OFFSET}px`,
    marginRight: `${CE_CONTROL_INSET_RIGHT}px`,
    minWidth: 0,
  },
  // 'auto': beside by default, above when the ROW is narrower than the (provisional) switch point.
  ceAutoGrid: { [NARROW]: { gridTemplateColumns: 'minmax(0, 1fr)' } },
  ceAutoLabel: {
    [NARROW]: {
      marginTop: `${CE_CONTROL_OFFSET}px`,
      minHeight: `${F.labelLineHeight}px`,
      paddingRight: 0,
    },
  },
  ceAutoControl: { [NARROW]: { marginTop: `${F.labelAboveGap}px` } },
  ceLabelText: {
    minWidth: 0,
    fontSize: tokens.fontSizeBase300,
    lineHeight: `${F.labelLineHeight}px`,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground1,
    overflowWrap: 'anywhere',
  },
  // Beside, the text fills the column so the marker sits at the column's end (measured: marker's
  // right edge 180px from the row). Above, the marker follows the text (position unmeasured).
  ceLabelTextFill: { flexGrow: 1 },
  ceAutoLabelText: { [NARROW]: { flexGrow: 0 } },
  ceRequired: {
    flexShrink: 0,
    color: tokens.colorPaletteRedForeground1,
    paddingLeft: `${CE_MARKER_GAP}px`,
  },
  // Beside: the marker takes half the column's 8px padding → text 168.5 + 4 + 7.5 = 176 + 4.
  ceRequiredBeside: { marginRight: `-${CE_MARKER_GAP}px` },
  ceAutoRequired: { [NARROW]: { marginRight: 0 } },
  // ── default ─────────────────────────────────────────────────────────────
  defaultBeside: {
    display: 'grid',
    alignItems: 'center',
    columnGap: '8px',
    minHeight: '38px',
    [`@media (max-width: ${BREAKPOINTS.sm}px)`]: {
      gridTemplateColumns: '1fr !important',
      alignItems: 'flex-start',
      minHeight: 0,
      rowGap: '4px',
    },
  },
  defaultAbove: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    rowGap: '2px',
    minHeight: '38px',
  },
  defaultLabel: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: '1.3',
    overflowWrap: 'anywhere',
  },
  // v8 FieldRow's marker: colors.danger, semibold, 2px after the text.
  defaultRequired: {
    color: colors.danger,
    marginLeft: '2px',
    fontWeight: tokens.fontWeightSemibold,
  },
});

const toCssLength = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);

/** A "Label : control" field row (Fluent UI v9). The control goes in `children`. */
export const FieldRow: React.FC<FieldRowProps> = ({
  label,
  required,
  htmlFor,
  labelPosition,
  labelWidth,
  look: lookProp,
  className,
  style,
  children,
}) => {
  const styles = useStyles();
  const ambientLook = useLook();
  const look = lookProp ?? ambientLook;
  const ce = look === 'ce';
  const position = labelPosition ?? (ce ? 'auto' : 'beside');
  const hasLabel = label != null;
  const column = toCssLength(labelWidth ?? (ce ? F.labelColumnWidth : 130));
  const LabelTag = htmlFor ? 'label' : 'span';

  if (!ce) {
    // Under the default look 'auto' behaves as 'beside' (with the v8 phone stack at 480px).
    const beside = position !== 'above' && hasLabel;
    return (
      <div
        className={mergeClasses(styles.spanAll, beside ? styles.defaultBeside : styles.defaultAbove, className)}
        style={{ ...(beside ? { gridTemplateColumns: `${column} 1fr` } : {}), ...style }}
        data-surface-part="field-row"
        data-look="default"
      >
        {hasLabel && (
          <LabelTag htmlFor={htmlFor} className={styles.defaultLabel} data-surface-part="label">
            {label}
            {required && (
              <span className={styles.defaultRequired} aria-hidden="true" data-surface-part="required">
                *
              </span>
            )}
          </LabelTag>
        )}
        {children}
      </div>
    );
  }

  const auto = position === 'auto' && hasLabel;
  const beside = position !== 'above' && hasLabel;
  return (
    <div
      className={mergeClasses(styles.spanAll, styles.ceRow, auto && styles.ceContainer, className)}
      style={style}
      data-surface-part="field-row"
      data-look="ce"
      data-label-position={position}
      data-container={auto ? 'inline-size' : undefined}
    >
      <div
        className={mergeClasses(styles.ceGrid, beside ? styles.ceGridBeside : styles.ceGridSingle, auto && styles.ceAutoGrid)}
        style={beside ? ({ '--sk-label-col': column } as React.CSSProperties) : undefined}
        data-surface-part="field-grid"
      >
        {hasLabel && (
          <LabelTag
            htmlFor={htmlFor}
            className={mergeClasses(beside ? styles.ceLabelBeside : styles.ceLabelAbove, auto && styles.ceAutoLabel)}
            data-surface-part="label"
          >
            <span
              className={mergeClasses(styles.ceLabelText, beside && styles.ceLabelTextFill, auto && styles.ceAutoLabelText)}
              data-surface-part="label-text"
            >
              {label}
            </span>
            {required && (
              <span
                className={mergeClasses(styles.ceRequired, beside && styles.ceRequiredBeside, auto && styles.ceAutoRequired)}
                aria-hidden="true"
                data-surface-part="required"
              >
                *
              </span>
            )}
          </LabelTag>
        )}
        <div
          className={mergeClasses(
            // No label: the control sits where a beside control would (2px down), full width.
            !hasLabel || beside ? styles.ceControlBeside : styles.ceControlAbove,
            auto && styles.ceAutoControl,
          )}
          data-surface-part="control"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default FieldRow;
