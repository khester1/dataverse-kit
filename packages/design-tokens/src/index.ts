// @dataverse-kit/design-tokens
//
// The single canonical source of the Dynamics 365 design tokens — colors, spacing,
// typography, radius, and layout. Pure-TS, ZERO dependencies (no react / no @fluentui),
// so it is safe to import from any layer, framework-agnostic code, or client project.
//
// surface-kit and @khester/reusable-components re-export these (so existing imports keep
// working); client projects should import them directly from here instead of re-declaring
// the values (the drift this package exists to end).
//
// NOTE: @khester/dynamics-utils ships a SEPARATE, differently-named spacing scale
// (xs/s/m/l/xl) for legacy reasons — it is intentionally NOT unified here.

export const colors = {
  brand: '#0078d4',
  brandHover: '#106ebe',
  brandDark: '#005a9e',
  borderNeutral: '#edebe9',
  textPrimary: '#323130',
  textSecondary: '#605e5c',
  surface: '#ffffff',
  surfaceAlt: '#f5f5f5',
  // App canvas behind cards/forms (matches the Dynamics model-driven form background).
  canvas: '#fafafa',
  // Required-field asterisk / error accent (Fluent error red).
  danger: '#a4262c',
  // Field input: subtle idle fill + neutral border (Dynamics-style).
  fieldFill: '#faf9f8',
  fieldFillReadonly: '#f3f2f1',
  fieldBorder: '#e1dfdd',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 40,
} as const;

export const typography = {
  fontFamily: '"Segoe UI", Arial, sans-serif',
  fontFamilySemibold: '"Segoe UI Semibold", "Segoe UI", sans-serif',
  fontSize: {
    sm: '12px',
    smPlus: '13px',
    md: '14px',
    lg: '17px',
  },
  fontWeight: {
    regular: 400,
    semibold: 600,
  },
} as const;

export const radius = {
  card: '4px',
  // Softer rounding for the outer form shell (matches Dynamics cards).
  lg: '8px',
} as const;

export const layout = {
  // Width of the label column in a two-column "Label : input" field row.
  labelColWidth: '130px',
} as const;

/**
 * MEASURED Dynamics 365 CE model-driven form layout (the UCI "new look"), for building forms that
 * are identical to a real Dynamics form. Every value comes from the dynamics-ui-kit repo's
 * `apps/ce-parity/reference/ce-layout-reference.json` (captured from a live org, 2026-09-29). That
 * repo's `check-reference.mjs` asserts EVERY leaf of this object against it in CI, and fails if a
 * leaf has no check. Change a value here only after re-measuring.
 *
 * Lengths are CSS px numbers. The older tokens above (`colors`, `layout.labelColWidth`, …) describe
 * the classic v8 look and are unchanged. `ceForm` is additive.
 *
 * ★ Every measured colour, shadow and radius is a STOCK Fluent 2 `webLightTheme` token, incl. the brand
 *   (`#0f6cbd`, not the classic Dynamics `#0078d4`). Components should style with the Fluent token
 *   named in `fluentTokens`, so they follow the theme. The hex values are for non-Fluent consumers
 *   and for the check.
 */
export const ceForm = {
  colors: {
    pageBackground: '#fafafa',
    cardBackground: '#ffffff',
    text: '#242424',
    textSubtle: '#424242',
    textStatus: '#616161',
    placeholder: '#707070',
    fieldFill: '#f5f5f5',
    actionFill: '#e6e6e6',
    divider: '#e0e0e0',
    pressedFill: '#e0e0e0',
    stroke: '#d1d1d1',
    brand: '#0f6cbd',
    link: '#115ea3',
    required: '#bc2f32',
    /** The stock subgrid's row rule (its header rule is `divider`). */
    rowRule: '#f0f0f0',
    /** A grouped grid's GROUP row fill (`groupedGrid`). */
    groupRowFill: '#fafafa',
    /** The 1px rule on top of every group row after the first. */
    groupRowRule: '#e0e0e0',
  },
  /** The Fluent v9 token each colour/shadow/radius corresponds to (measured values are identical). */
  fluentTokens: {
    pageBackground: 'colorNeutralBackground2',
    cardBackground: 'colorNeutralBackground1',
    text: 'colorNeutralForeground1',
    textSubtle: 'colorNeutralForeground2',
    textStatus: 'colorNeutralForeground3',
    placeholder: 'colorNeutralForeground4',
    fieldFill: 'colorNeutralBackground3',
    actionFill: 'colorNeutralBackground6',
    divider: 'colorNeutralStroke2',
    // ★ Matches the measured open-switcher fill by VALUE. Fluent's MenuButton styles an OPEN subtle
    //   trigger with colorSubtleBackgroundSelected (#ebebeb), not Pressed (#e0e0e0), so either
    //   Dynamics' switcher is not a stock MenuButton or the ad-hoc read caught :active. Open item
    //   in the reference; a v9 MenuButton-based switcher must set this fill explicitly.
    pressedFill: 'colorSubtleBackgroundPressed',
    stroke: 'colorNeutralStroke1',
    brand: 'colorCompoundBrandStroke',
    link: 'colorBrandForegroundLink',
    required: 'colorPaletteRedForeground1',
    rowRule: 'colorNeutralStroke3',
    groupRowFill: 'colorNeutralBackground2',
    groupRowRule: 'colorNeutralStroke2',
    cardShadow: 'shadow4',
    menuShadow: 'shadow16',
    cardRadius: 'borderRadiusXLarge',
    controlRadius: 'borderRadiusMedium',
  },
  shadow: {
    card: '0 0 2px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.14)',
    menu: '0 0 2px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.14)',
  },
  radius: { card: 8, control: 4 },
  /** Page insets: command bar card 16px in, header card + tab columns 8px in, 20px on the right. */
  page: { commandBarInsetLeft: 16, insetLeft: 8, insetRight: 20 },
  commandBar: {
    cardHeight: 46,
    marginTop: 8,
    buttonHeight: 32,
    buttonPaddingX: 12,
    iconSize: 16,
    overflowWidth: 44,
    shareHeight: 24,
    sharePaddingX: 8,
    shareFontSize: 12,
    shareLineHeight: 16,
    /** Share (far item) icon — larger than the commands' 16. */
    shareIconSize: 20,
    /** Icon → label gap in a command (icon at +12, label at +35). */
    iconGap: 7,
    /** Back / pop-out buttons, and the inset of the first one from the card's left edge. */
    backWidth: 42,
    popOutWidth: 40,
    navInsetLeft: 6,
    /** Nav dividers are 24 tall; the divider inside a split command is 20. */
    dividerHeight: 24,
    splitDividerHeight: 20,
    /** Menu commands end in this zone holding a 12px chevron. */
    chevronZone: 40,
    /** Split command: main, this gap, a divider, a 40px chevron whose SLOT is 40 − overhang. */
    splitGap: 5,
    splitChevronOverhang: 5,
    /** The commands region pads this on the right; the far region pads farPadding either side. */
    commandsPaddingRight: 14,
    farPadding: 10,
  },
  header: {
    /** Gap between the command bar card and the header card. */
    marginTop: 16,
    padding: [14, 20, 0, 20],
    regionHeight: 66.5,
    avatarSize: 40,
    /** Transparent ring around the avatar; the avatar tile is avatarSize + 2 × ring. */
    avatarRing: 2,
    /** Measured from the avatar TILE (circle + ring) to the title. */
    avatarToTitleGap: 14,
    titleFontSize: 20,
    titleLineHeight: 28,
    statusPaddingLeft: 6,
    /** Entity name · form switcher row, from the title's top. */
    subtitleOffset: 32,
    switcherHeight: 22,
    switcherPaddingX: 2,
    fieldValueFontSize: 14,
    fieldValueLineHeight: 20,
    fieldLabelFontSize: 12,
    fieldLabelLineHeight: 16,
    dividerWidth: 1,
    dividerHeight: 38,
    dividerSpacing: 12,
    ownerAvatarSize: 32,
    presenceSize: 12,
    expandButtonSize: 32,
    menu: { padding: 4, itemHeight: 32, itemPadding: 6, checkSlot: 16, checkToLabelGap: 4 },
  },
  tabs: {
    stripHeight: 59,
    stripPadding: [14, 144, 0, 21],
    tabHeight: 45,
    gap: 20,
    fontSize: 16,
    // ★ NOT a Fluent type-ramp step: Fluent's large Tab is 16/22 (Base400); 28 pairs with 20px
    //   (Base500). A Fluent v9 TabList must override the line height to match.
    lineHeight: 28,
    underlineHeight: 3,
    underlineRadius: 2,
  },
  tabBody: {
    padding: [16, 2, 21, 0],
    /** Columns start this far right of the tab panel (a derived inset, not the panel's padding). */
    contentInsetLeft: 8,
    columnGap: 16,
    sectionGap: 16,
    /** A tab column never renders narrower than this; see the column rule in the reference. */
    columnMinWidth: 340,
  },
  section: {
    padding: [4, 16, 16, 16],
    /** Multi-column section: equal columns, no gap; every column but the last pads this on the right. */
    columnGutter: 21,
    titleFontSize: 14,
    titleLineHeight: 20,
    titlePaddingTop: 4,
    titleHeight: 24,
  },
  field: {
    /** Rendered label column. The formxml `labelwidth` (115) is declared but NOT what renders. */
    labelColumnWidth: 184,
    labelLineHeight: 20,
    rowPaddingTopFirst: 8,
    rowPaddingTop: 12,
    rowPitchBeside: 48,
    rowPitchAbove: 72,
    labelAboveGap: 4,
    inputHeight: 32,
    inputPaddingX: 12,
    multilineHeight: 76,
    actionButtonSize: 32,
  },
  /**
   * A STOCK subgrid in a section (the Power Apps grid), measured on a website record's Site Settings
   * tab (apps/ce-parity/reference/captures/website-sitesettings-subgrid-1710.txt). "Grid root" is the
   * control's box, which fills the section's content box; offsets are from its top/right edges.
   */
  subgrid: {
    /**
     * The grid root's top sits this far below the section's CONTENT top (border + padding). Field
     * rows instead start pulled up by `ceFieldRowFirstOffset`, so a grid in a ce Section needs
     * `marginTop: ceFieldRowFirstOffset + sectionOffsetTop`.
     */
    sectionOffsetTop: 4,
    /** Header and rows sit inset this far inside the grid root (its ag-root padding). */
    gridPaddingLeft: 20,
    gridPaddingRight: 32,
    /** The grid's commands: one right-aligned row, this far below the grid root's top. */
    commandsOffsetTop: 1,
    commandHeight: 42,
    commandPaddingX: 14,
    /** A command's label starts this far right of the button's left edge (the icon box itself is unmeasured). */
    commandLabelOffset: 44,
    /** A menu command ("Flow ▾") has no right padding: the label is followed by this chevron zone. */
    menuChevronZone: 30,
    /** The `⋮` button. */
    overflowWidth: 44,
    /** The command row ends this far inside the grid root's right edge. */
    commandsInsetRight: 1,
    /** Quick find: its own row UNDER the commands, right-aligned. */
    quickFindWidth: 180,
    quickFindHeight: 32,
    /** From the commands' top to quick find's top. */
    quickFindOffsetTop: 49,
    /** From the grid root's right edge to quick find's right edge. */
    quickFindInsetRight: 11,
    /** The header starts this far below the grid root's top (commands + quick find above it). */
    gridOffsetTop: 85,
    headerHeight: 43,
    headerCellHeight: 42,
    rowHeight: 42,
    selectColumnWidth: 44,
    checkboxSize: 16,
    /** A cell's text starts this far right of the cell's left edge. */
    cellTextInset: 12,
    /** The "Rows: N" footer under the grid. */
    footerHeight: 45,
  },
  /**
   * A stock subgrid GROUPED at runtime (the Power Apps grid's column-menu "Group by"), measured on a
   * temporary account form's sub-accounts subgrid and cross-checked on System Jobs
   * (apps/ce-parity/reference/captures/account-temp-grouped-nested-1710.txt, asyncoperation-grouped-1710.txt).
   * Everything else — header, data rows, select column, checkbox (also 16px on a group row), footer —
   * is `subgrid`'s. Group rows fill `colors.groupRowFill`; every group row after the first carries a
   * 1px `colors.groupRowRule` on top, inside the same row pitch.
   */
  groupedGrid: {
    /** A "Group by: <column>" column is inserted FIRST, at this width; the grouped column stays. */
    groupByColumnWidth: 300,
    /** That column's header text starts with this. */
    groupByHeaderPrefix: 'Group by: ',
    groupRowHeight: 42,
    /** The expand chevron's box starts this far into the Group-by cell (the cell's left edge). */
    chevronOffset: 2,
    chevronWidth: 20,
    chevronHeight: 38,
    chevronIconSize: 20,
    /** From the chevron box's right edge to the label. */
    chevronToLabelGap: 12,
    /** The label and its count are ONE semibold text run, "Label (n)". */
    labelFontSize: 14,
    labelLineHeight: 38,
    /** The label of the group of empty values (lowercase, as the stock grid writes it). */
    blankLabel: '(blank)',
  },
  /**
   * The stock grid with CHILD ITEMS set (a row expands to a child grid in place), measured on the same
   * temporary account form (apps/ce-parity/reference/captures/account-temp-grouped-nested-1710.txt,
   * stages nestedgrid.*). There is NO extra column: the 44px select cell holds the checkbox zone and
   * then the expander, so data columns start where a flat grid's do. Every row after the first carries
   * a 1px `colors.divider` rule on top, inside the 42px pitch. The expander icon is `colors.textStatus`.
   */
  nestedGrid: {
    /** The select cell's checkbox zone; the expander starts here. */
    checkboxZoneWidth: 19.9,
    /** The expander button: this wide, the full row height, ending at the select cell's right edge. */
    expanderWidth: 24.1,
    expanderIconSize: 12,
    /** The detail row's child grid (a ce grid, its own header + "Rows: N" footer, no toolbar) is inset
     *  this far inside the detail row. */
    detailInsetLeft: 50,
    detailInsetTop: 12,
    detailInsetRight: 44,
  },
} as const;
