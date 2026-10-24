import { mergeStyles, IDetailsListStyles, IDetailsRowStyles } from '@fluentui/react';

// `dynamicsCeColors` (sectionBorder / commandBarBg) was declared here and never read — removed
// 2026-08-06. It is not merely tidiness: this file is VENDORED into generated projects, and the
// `web-resource` target builds through react-scripts, which turns `no-unused-vars` into a build
// ERROR whenever `CI` is set. A dead const here failed `npm run build` in every user pipeline.

/**
 * Dynamics 365 Grid color tokens.
 * Inlined for standalone package use.
 */
const dynamicsGridColors = {
  headerBackground: '#f8f8f8',
  headerBorder: '#e1e1e1',
  rowSelected: '#cce4f6',
  rowSelectedBorder: '#0078d4',
  rowSelectedHover: '#b3d7f2',
  rowHover: '#f3f2f1',
  footerBorder: '#edebe9',
  footerText: '#605e5c',
};

// ============================================================================
// Cell-Level Styles
// ============================================================================

/**
 * Cell container - ensures proper vertical alignment.
 */
export const cellClass = mergeStyles({
  display: 'flex',
  alignItems: 'center',
  height: '100%',
});

/**
 * Link cell style - clickable text with hover underline.
 */
export const linkCellClass = mergeStyles({
  fontWeight: 600,
  color: '#0078d4',
  cursor: 'pointer',
  '&:hover': {
    textDecoration: 'underline',
  },
  '&:focus': {
    outline: '2px solid #0078d4',
    outlineOffset: 2,
  },
});

/**
 * Colored cell badge style.
 */
export const coloredBadgeClass = mergeStyles({
  padding: '2px 8px',
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 600,
  display: 'inline-block',
});

/**
 * Currency cell style - right-aligned numbers.
 */
export const currencyCellClass = mergeStyles({
  textAlign: 'right',
  fontFamily: 'Consolas, "Courier New", monospace',
});

/**
 * Progress bar container.
 */
export const progressBarContainerClass = mergeStyles({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
});

/**
 * Progress bar background.
 */
export const progressBarBackgroundClass = mergeStyles({
  flex: 1,
  height: 8,
  backgroundColor: '#edebe9',
  borderRadius: 4,
  overflow: 'hidden',
});

/**
 * Progress bar fill (requires dynamic width via style prop).
 */
export const progressBarFillClass = mergeStyles({
  height: '100%',
  backgroundColor: '#0078d4',
  borderRadius: 4,
  transition: 'width 0.3s ease',
});

/**
 * Progress bar label.
 */
export const progressBarLabelClass = mergeStyles({
  fontSize: 12,
  color: '#605e5c',
  minWidth: 40,
  textAlign: 'right',
});

/**
 * Icon button cell style.
 */
export const iconButtonCellClass = mergeStyles({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

/**
 * Rating cell container - row of star glyphs.
 */
export const ratingCellClass = mergeStyles({
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  height: '100%',
});

/**
 * Single rating star glyph.
 */
export const ratingStarClass = mergeStyles({
  fontSize: 16,
  // NOTE: quoted so merge-styles emits the unitless `line-height: 1` (a font-size
  // multiplier). A numeric `1` here is emitted as `line-height: 1px`, which
  // collapses the star glyph to a 1px sliver (it renders as a dash, not a star).
  lineHeight: '1',
  userSelect: 'none',
});

/**
 * Composite cell container - lays out ordered slots.
 */
export const compositeCellClass = mergeStyles({
  display: 'flex',
  height: '100%',
});

/**
 * Editable cell container - base wrapper for inline edit controls.
 */
export const editableCellClass = mergeStyles({
  display: 'flex',
  alignItems: 'center',
  height: '100%',
  width: '100%',
  position: 'relative',
});

/**
 * Editable cell input wrapper - provides the dirty/error border indicators.
 */
export const editableCellInputWrapperClass = mergeStyles({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  position: 'relative',
});

/**
 * Dirty cell indicator - blue left border on edited cells.
 * Apply as additional class when cell is dirty.
 */
export const dirtyCellIndicatorClass = mergeStyles({
  '&::before': {
    content: '""',
    position: 'absolute',
    left: -8,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#0078d4',
    borderRadius: '1px',
  },
});

/**
 * Error cell indicator - red left border on cells with validation errors.
 * Apply as additional class when cell has error.
 */
export const errorCellIndicatorClass = mergeStyles({
  '&::before': {
    content: '""',
    position: 'absolute',
    left: -8,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#d13438',
    borderRadius: '1px',
  },
});

/**
 * Error message text below field.
 */
export const cellErrorTextClass = mergeStyles({
  color: '#d13438',
  fontSize: 11,
  position: 'absolute',
  bottom: -14,
  left: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
});

// ============================================================================
// Lookup Cell Styles
// ============================================================================

/**
 * Lookup cell container - wrapper for the search input and dropdown.
 */
export const lookupCellContainerClass = mergeStyles({
  position: 'relative',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
});

/**
 * Lookup dropdown container - positioned below the input.
 */
export const lookupDropdownClass = mergeStyles({
  position: 'absolute',
  top: '100%',
  left: -8,
  right: -8,
  zIndex: 1000,
  backgroundColor: 'white',
  border: '1px solid #edebe9',
  boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16)',
  maxHeight: 200,
  overflowY: 'auto',
  borderRadius: 2,
  marginTop: 2,
});

/**
 * Lookup dropdown item - each selectable option.
 */
export const lookupDropdownItemClass = mergeStyles({
  padding: '8px 12px',
  cursor: 'pointer',
  fontSize: 13,
  '&:hover': {
    backgroundColor: '#f3f2f1',
  },
});

/**
 * Lookup dropdown item - active/selected state.
 */
export const lookupDropdownItemActiveClass = mergeStyles({
  backgroundColor: '#f3f2f1',
});

/**
 * Lookup dropdown item - none option (clear selection).
 */
export const lookupDropdownNoneOptionClass = mergeStyles({
  padding: '8px 12px',
  cursor: 'pointer',
  fontSize: 13,
  fontStyle: 'italic',
  color: '#605e5c',
  borderBottom: '1px solid #edebe9',
  '&:hover': {
    backgroundColor: '#f3f2f1',
  },
});

/**
 * Lookup loading indicator.
 */
export const lookupLoadingClass = mergeStyles({
  padding: '8px 12px',
  fontSize: 13,
  color: '#605e5c',
  fontStyle: 'italic',
});

/**
 * Lookup no results message.
 */
export const lookupNoResultsClass = mergeStyles({
  padding: '8px 12px',
  fontSize: 13,
  color: '#605e5c',
  fontStyle: 'italic',
});

/**
 * Lookup clear button - positioned inside the input.
 */
export const lookupClearButtonClass = mergeStyles({
  position: 'absolute',
  right: 4,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 20,
  height: 20,
  minWidth: 20,
  padding: 0,
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#605e5c',
  '&:hover': {
    color: '#323130',
    backgroundColor: '#f3f2f1',
    borderRadius: 2,
  },
});

/**
 * Lookup read mode link - displays lookup value as clickable link.
 */
export const lookupReadModeLinkClass = mergeStyles({
  color: '#0078d4',
  cursor: 'pointer',
  textDecoration: 'none',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  '&:hover': {
    textDecoration: 'underline',
  },
  '&:focus': {
    outline: '2px solid #0078d4',
    outlineOffset: 2,
  },
});

// ============================================================================
// Grid-Level Styles (for consumers building full grids)
// ============================================================================

/**
 * Get DetailsList styles for consistent Dynamics CE look.
 */
export function getDetailsListStyles(): Partial<IDetailsListStyles> {
  return {
    root: {},
    headerWrapper: {
      '.ms-DetailsHeader': {
        backgroundColor: dynamicsGridColors.headerBackground,
        borderBottom: `1px solid ${dynamicsGridColors.headerBorder}`,
        paddingTop: 0,
        height: 42,
      },
      '.ms-DetailsHeader-cell': {
        fontSize: 13,
        fontWeight: 600,
        color: '#323130',
      },
      '.ms-DetailsHeader-cellTitle': {
        fontSize: 13,
        fontWeight: 600,
      },
    },
  };
}

/**
 * Get row styles for consistent hover behavior.
 */
export function getRowStyles(): Partial<IDetailsRowStyles> {
  return {
    root: {
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: '#f3f2f1',
      },
    },
  };
}

/**
 * Get row styles with selection highlighting (Dynamics 365 native look).
 * @param isSelected - Whether the row is currently selected
 */
export function getRowStylesWithSelection(isSelected?: boolean): Partial<IDetailsRowStyles> {
  return {
    root: {
      cursor: 'pointer',
      backgroundColor: isSelected ? dynamicsGridColors.rowSelected : undefined,
      borderLeft: isSelected ? `3px solid ${dynamicsGridColors.rowSelectedBorder}` : '3px solid transparent',
      '&:hover': {
        backgroundColor: isSelected
          ? dynamicsGridColors.rowSelectedHover
          : dynamicsGridColors.rowHover,
      },
    },
  };
}
