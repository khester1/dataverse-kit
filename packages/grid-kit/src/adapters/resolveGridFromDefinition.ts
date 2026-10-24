/**
 * Adapter: a (duck-typed) form-runtime `GridCustomizerDefinition` → the right
 * grid-kit host + props. Lets a designer-authored grid drive grid-kit at runtime.
 * grid-kit never imports form-runtime; keep these local shapes in sync with
 *   the form-runtime grid-customizer types (not published)
 *
 * Data-fetch stays with the consumer: nested children come from `opts.resolveNested`.
 */
import type {
  CardGridProps,
  ColumnDef,
  FocusedViewConfig,
  FocusedViewGridProps,
  GridProps,
  GroupedGridProps,
  NestedConfig,
  NestedDisplayMode,
  NestedGridProps,
  ReadOnlyGridProps,
} from '../types';
import { fromGridCustomizerDefinition, GridColumnDefinitionLike } from './fromGridCustomizerDefinition';

export type GridTypeLike = 'standard' | 'editable' | 'readonly' | 'focused-view' | 'card-list';

/** Subset of form-runtime's `GridCustomizerDefinition` (grid-level fields). */
export interface GridDefinitionLike {
  columns: GridColumnDefinitionLike[];
  isEditable?: boolean;
  gridType?: GridTypeLike;
  selectionMode?: 'none' | 'single' | 'multiple';
  showCommandBar?: boolean;
  /** Grid-level zebra striping (mirrors form-runtime's `alternateRowColors`). */
  alternateRowColors?: { even: string; odd: string };
  cardView?: {
    enabled?: boolean;
    cardsPerRow?: number;
    cardHeight?: number;
    titleField?: string;
    subtitleField?: string;
    imageField?: string;
  };
  nestedGridId?: string;
  nestedDisplay?: {
    mode?: NestedDisplayMode;
    panelSize?: 'small' | 'medium' | 'large';
    hoverDelay?: number;
    calloutMaxRows?: number;
    triggerLabel?: string;
    triggerIcon?: string;
    childSelectionMode?: 'none' | 'single' | 'multiple';
    childEditable?: boolean;
    childEditTrigger?: 'click' | 'always';
  };
  /** Child-selection gating relative to the parent (→ `NestedConfig.childSelectionGating`). */
  nestedSelectionMode?: 'independent' | 'requires-parent';
  focusedView?: {
    config?: FocusedViewConfig;
    primaryNameField?: string;
    summaryFields?: { label: string; fieldName: string }[];
  };
}

/** A grid-kit host choice + the props to render it with. */
export type ResolvedGrid<T = Record<string, unknown>> =
  | { host: 'data'; props: GridProps<T> }
  | { host: 'readonly'; props: ReadOnlyGridProps<T> }
  | { host: 'card'; props: CardGridProps<T> }
  | { host: 'grouped'; props: GroupedGridProps<T> }
  | { host: 'nested'; props: NestedGridProps<T> }
  | { host: 'focused-view'; props: FocusedViewGridProps<T> };

export interface ResolveGridOptions<T> {
  /**
   * Supply the nested child grid's columns + a parent→children resolver. Called
   * only when `def.nestedGridId` is set. grid-kit does NOT fetch — the consumer
   * owns the relationship/FetchXML here.
   */
  resolveNested?: (def: GridDefinitionLike) => {
    childColumns: ColumnDef[];
    getChildren: (parent: T) => Record<string, unknown>[] | Promise<Record<string, unknown>[]>;
  };
}

/** Default nested display mode by parent grid type (mirrors form-runtime's v11→v12 migration). */
function defaultNestedMode(gridType?: GridTypeLike): NestedDisplayMode {
  if (gridType === 'focused-view') return 'detail-pane';
  if (gridType === 'card-list') return 'side-panel';
  return 'inline';
}

/** Build a FocusedViewConfig from a definition's focused-view settings (config or legacy fields). */
function toFocusedViewConfig(fv: GridDefinitionLike['focusedView']): FocusedViewConfig {
  if (fv?.config) return fv.config;
  const rows = [
    fv?.primaryNameField
      ? { id: 'primary', primaryField: { fieldName: fv.primaryNameField, label: 'Name' } }
      : undefined,
    ...(fv?.summaryFields ?? []).map((s, i) => ({
      id: `s${i}`,
      primaryField: { fieldName: s.fieldName, label: s.label },
    })),
  ].filter(Boolean) as FocusedViewConfig['rows'];
  return { rows: rows.length ? rows : [{ id: 'primary', primaryField: { fieldName: 'name', label: 'Name' } }] };
}

/**
 * Resolve a grid definition into the host + props grid-kit should render.
 * `nestedGridId` (with `opts.resolveNested`) wraps the result in a NestedGrid;
 * otherwise the `gridType` selects card / focused-view / readonly / data.
 */
export function resolveGridFromDefinition<T extends Record<string, unknown>>(
  def: GridDefinitionLike,
  items: T[],
  opts: ResolveGridOptions<T> = {}
): ResolvedGrid<T> {
  const columns = fromGridCustomizerDefinition<T>(def);
  const base: GridProps<T> = {
    items,
    columns,
    editable: def.gridType === 'editable' || (!!def.isEditable && def.gridType !== 'readonly'),
    selectionMode: def.gridType === 'readonly' ? 'none' : def.selectionMode ?? 'none',
    alternateRowColors: def.alternateRowColors,
  };

  if (def.nestedGridId && opts.resolveNested) {
    const { childColumns, getChildren } = opts.resolveNested(def);
    const nested: NestedConfig<T> = {
      mode: def.nestedDisplay?.mode ?? defaultNestedMode(def.gridType),
      childColumns,
      getChildren,
      panelSize: def.nestedDisplay?.panelSize,
      hoverDelay: def.nestedDisplay?.hoverDelay,
      calloutMaxRows: def.nestedDisplay?.calloutMaxRows,
      triggerLabel: def.nestedDisplay?.triggerLabel,
      triggerIcon: def.nestedDisplay?.triggerIcon,
      childSelectionMode: def.nestedDisplay?.childSelectionMode,
      childSelectionGating: def.nestedSelectionMode,
      childEditable: def.nestedDisplay?.childEditable,
      childEditTrigger: def.nestedDisplay?.childEditTrigger,
    };
    // A focused-view parent with a detail-pane child is a master-detail layout.
    if (def.gridType === 'focused-view') {
      return { host: 'focused-view', props: { ...base, focusedView: toFocusedViewConfig(def.focusedView), nested } };
    }
    return { host: 'nested', props: { ...base, nested } };
  }

  switch (def.gridType) {
    case 'card-list':
      return {
        host: 'card',
        props: {
          ...base,
          card: {
            cardsPerRow: def.cardView?.cardsPerRow,
            cardHeight: def.cardView?.cardHeight,
            titleField: def.cardView?.titleField,
            subtitleField: def.cardView?.subtitleField,
            imageField: def.cardView?.imageField,
          },
        },
      };
    case 'focused-view':
      return { host: 'focused-view', props: { ...base, focusedView: toFocusedViewConfig(def.focusedView) } };
    case 'readonly':
      return { host: 'readonly', props: base };
    case 'editable':
    case 'standard':
    default:
      return { host: 'data', props: base };
  }
}
