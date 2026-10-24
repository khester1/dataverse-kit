import React, { useMemo, useState } from 'react';
import { ActionButton, Icon, SearchBox, Stack, Text, mergeStyles } from '@fluentui/react';
import type { ColumnDef, FocusedViewGridProps, FocusedViewField } from '../types';
import { buildCellProps, getFieldValue } from '../adapters';
import { deriveIsNarrow } from '../core/responsive';
import { useContainerWidth } from './useContainerWidth';
import { useEditState } from './useEditState';
import { useGridContext } from './useGridContext';
import { useRowContextMenu } from './useRowContextMenu';
import { DataGrid } from './DataGrid';
import { CHILDREN_LOAD_ERROR, childrenError } from './nested/useChildren';

const railClass = mergeStyles({ width: 320, minWidth: 260, borderRight: '1px solid #edebe9', overflowY: 'auto' });
// Below the `md` breakpoint the rail becomes the single full-width pane (no fixed
// 320px column, no right border — the detail pane replaces it when a row is picked).
const railNarrowClass = mergeStyles({ width: '100%', overflowY: 'auto' });
const railItemBase = {
  padding: '10px 12px',
  borderBottom: '1px solid #f3f2f1',
  cursor: 'pointer',
  display: 'flex',
  gap: 10,
  alignItems: 'flex-start',
};
const detailRowClass = mergeStyles({
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  padding: '6px 0',
  borderBottom: '1px solid #f3f2f1',
  fontSize: 13,
});

/**
 * Focused-view / master-detail host. A left rail of summary items (each rendered
 * from `focusedView.rows`) drives a right detail pane (the active record's
 * `detailFields`, each value through the registry). When a `nested` config with
 * `mode: 'detail-pane'` is supplied, the child grid renders inside the pane.
 */
export function FocusedViewGrid<T extends Record<string, unknown>>(props: FocusedViewGridProps<T>): JSX.Element {
  const { items, columns, focusedView, nested, onActiveItemChanged, fill, height, rowCommands } = props;
  // The detail pane renders read-only (registry.resolve(col, false)); useEditState
  // is threaded only because useGridContext bundles it — no inline editing here.
  const edit = useEditState();
  const { getKeyFn, ctx } = useGridContext<T>(props, edit);
  // Per-row right-click menu on the left rail (parity with DataGrid/NestedInline). The
  // rail items are raw divs, so we invoke the hook fn from a native onContextMenu and
  // suppress the browser menu with e.preventDefault() (the hook's `return false` only
  // matters to Fluent's DetailsList contract). No child stopPropagation is needed: the
  // detail pane is a SIBLING of the rail (not nested inside a rail item), unlike the
  // inline child grids in NestedInline / NestedCardParent.
  const { onItemContextMenu, contextMenuElement } = useRowContextMenu<T>(rowCommands);

  const [activeKey, setActiveKey] = useState<string | undefined>(() => (items[0] ? getKeyFn(items[0]) : undefined));
  const [search, setSearch] = useState('');
  // Container-relative responsive: below `md` (768px) the rail + detail stack into a
  // single full-width pane (rail until a row is picked, then detail + a Back affordance).
  // Width 0 (first paint / no-DOM) → wide two-pane layout (no flash). Internal + always-on.
  const [rootRef, width] = useContainerWidth<HTMLDivElement>();
  const isNarrow = deriveIsNarrow(width);

  const byField = useMemo(() => {
    const m = new Map<string, ColumnDef<T>>();
    columns.forEach((c) => m.set(c.fieldName, c));
    return m;
  }, [columns]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    const fields = focusedView.rows.flatMap((r) =>
      [r.primaryField.fieldName, r.secondaryField?.fieldName].filter(Boolean) as string[]
    );
    return items.filter((it) => fields.some((f) => String(getFieldValue(it, f) ?? '').toLowerCase().includes(q)));
  }, [items, search, focusedView.rows]);

  const active = useMemo(() => items.find((it) => getKeyFn(it) === activeKey), [items, activeKey, getKeyFn]);

  const detailColumns = useMemo(() => {
    if (!focusedView.detailFields) return columns;
    return focusedView.detailFields.map((f) => byField.get(f)).filter(Boolean) as ColumnDef<T>[];
  }, [focusedView.detailFields, byField, columns]);

  const fieldText = (item: T, field?: FocusedViewField): string => {
    if (!field) return '';
    const v = getFieldValue(item, field.fieldName);
    return v == null ? '' : String(v);
  };

  const select = (item: T) => {
    setActiveKey(getKeyFn(item));
    onActiveItemChanged?.(item);
  };

  const renderDetailValue = (col: ColumnDef<T>, item: T): React.ReactNode => {
    const cellProps = buildCellProps(col, item, ctx);
    const Renderer = ctx.registry.resolve(col, false);
    return <Renderer {...cellProps} />;
  };

  const railNode = (
      <div className={isNarrow ? railNarrowClass : railClass}>
        <div style={{ padding: 8, borderBottom: '1px solid #edebe9' }}>
          <SearchBox placeholder="Search" onChange={(_, v) => setSearch(v ?? '')} underlined />
        </div>
        {filtered.map((item) => {
          const key = getKeyFn(item);
          const isActive = key === activeKey;
          return (
            <div
              key={key}
              style={{ ...railItemBase, background: isActive ? '#e1efff' : undefined, borderLeft: isActive ? '3px solid #0078d4' : '3px solid transparent' }}
              onClick={() => select(item)}
              onContextMenu={
                onItemContextMenu
                  ? (e) => {
                      e.preventDefault();
                      onItemContextMenu(item, undefined, e.nativeEvent);
                    }
                  : undefined
              }
            >
              {focusedView.rows[0]?.iconName && <Icon iconName={focusedView.rows[0].iconName} styles={{ root: { fontSize: 18, color: '#0078d4' } }} />}
              <Stack tokens={{ childrenGap: 2 }}>
                {focusedView.rows.map((row) => (
                  <div key={row.id}>
                    <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                      {fieldText(item, row.primaryField)}
                    </Text>
                    {row.secondaryField && (
                      <Text variant="small" styles={{ root: { color: '#605e5c', paddingLeft: 6 } }}>
                        {fieldText(item, row.secondaryField)}
                      </Text>
                    )}
                  </div>
                ))}
              </Stack>
            </div>
          );
        })}
      </div>
  );

  const detailNode = (
      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        {isNarrow && active && (
          <ActionButton
            iconProps={{ iconName: 'Back' }}
            onClick={() => setActiveKey(undefined)}
            styles={{ root: { padding: 0, marginBottom: 8, height: 'auto' } }}
          >
            Back
          </ActionButton>
        )}
        {!active ? (
          <Text variant="medium" styles={{ root: { color: '#605e5c' } }}>
            Select a record to see its details.
          </Text>
        ) : focusedView.childOnly ? (
          // childOnly: the pane IS the related-records grid — no title heading, no
          // detail-field list, no "Related" subheading. Pure master/detail.
          nested ? (
            <DetailPaneChildren parent={active} nested={nested} />
          ) : (
            <Text variant="medium" styles={{ root: { color: '#605e5c' } }}>
              No related records configured.
            </Text>
          )
        ) : (
          <Stack tokens={{ childrenGap: 4 }}>
            <Text variant="large" styles={{ root: { fontWeight: 600, marginBottom: 8 } }}>
              {fieldText(active, focusedView.rows[0]?.primaryField)}
            </Text>
            {detailColumns.map((col) => (
              <div key={col.key} className={detailRowClass}>
                <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                  {col.name}
                </Text>
                <span>{renderDetailValue(col, active)}</span>
              </div>
            ))}
            {nested && nested.mode === 'detail-pane' && (
              <div style={{ paddingTop: 16 }}>
                <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                  Related
                </Text>
                <DetailPaneChildren parent={active} nested={nested} />
              </div>
            )}
          </Stack>
        )}
      </div>
  );

  return (
    <div ref={rootRef}>
      <Stack horizontal={!isNarrow} styles={{ root: { border: '1px solid #edebe9', borderRadius: 4, height: height ?? (fill ? '100%' : 460) } }}>
        {/* Wide: rail (320px) + detail side by side — byte-identical to before.
            Narrow (< md): one full-width pane — rail until a row is picked, then the
            detail pane (with a Back affordance that clears the active row). */}
        {(!isNarrow || !active) && railNode}
        {(!isNarrow || active) && detailNode}
      </Stack>
      {contextMenuElement}
    </div>
  );
}

/** Resolves + renders the detail-pane child grid for the active record. */
function DetailPaneChildren<T extends Record<string, unknown>>(props: {
  parent: T;
  nested: NonNullable<FocusedViewGridProps<T>['nested']>;
}): JSX.Element {
  const { parent, nested } = props;
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  // ★ A sync throw or a rejected promise used to leave "Loading…" up forever. Choosing ANOTHER record retries
  //   (the effect re-runs on a new `parent`); re-selecting the active one does not.
  const [error, setError] = useState<Error | undefined>(undefined);

  React.useEffect(() => {
    let alive = true;
    setError(undefined);
    let result: Record<string, unknown>[] | Promise<Record<string, unknown>[]>;
    try {
      result = nested.getChildren(parent) as Record<string, unknown>[] | Promise<Record<string, unknown>[]>;
    } catch (e) {
      setRows([]);
      setError(childrenError(e));
      return () => {
        alive = false;
      };
    }
    if (Array.isArray(result)) setRows(result);
    else {
      setRows(null);
      Promise.resolve(result).then(
        (r) => alive && setRows(r),
        (e: unknown) => {
          if (!alive) return;
          setRows([]);
          setError(childrenError(e));
        },
      );
    }
    return () => {
      alive = false;
    };
    // `nested.reloadToken` makes the refetch explicit on a child mutation (e.g. addExisting)
    // rather than relying on `nested`'s inline-literal identity changing each render.
  }, [parent, nested, nested.reloadToken]);

  if (error !== undefined) return <span role="alert" data-gridkit-children-error="">{CHILDREN_LOAD_ERROR}</span>;
  if (rows === null) return <Text variant="small">Loading…</Text>;
  return (
    <DataGrid
      items={rows}
      columns={nested.childColumns}
      registry={nested.childRegistry}
      compact
      selectionMode={nested.childSelectionMode}
      onSelectionChanged={
        nested.onChildSelectionChanged ? (sel) => nested.onChildSelectionChanged!(parent, sel) : undefined
      }
      editable={nested.childEditable}
      editTrigger={nested.childEditTrigger}
      onValueChange={
        nested.onChildValueChange
          ? (rk, fn, v, ov) => nested.onChildValueChange!(parent, rk, fn, v, ov)
          : undefined
      }
    />
  );
}
