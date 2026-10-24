/**
 * The Fluent UI v9 focused-view / master-detail host — the v9 counterpart of the v8
 * `<FocusedViewGrid>`. A left summary rail (from `focusedView.rows`) drives a right
 * detail pane (the active record's `detailFields`, each value through the v9 registry);
 * a `nested` `mode:'detail-pane'` config renders a child v9 `<DataGrid>` in the pane.
 * Below the `md` breakpoint the rail + pane stack (rail until a row is picked, then the
 * detail + a Back affordance) — reusing the pure `deriveIsNarrow` + `useContainerWidth`.
 *
 * `FocusedViewRow.iconName` (a v8 Fluent icon-name string) is ignored in v9 v1 — a
 * v9-native `ReactElement` rail icon is a follow-on. Right-click row commands are deferred.
 */
import React, { useMemo, useState, useEffect, type CSSProperties } from 'react';
import {
  SearchBox,
  Button,
  Text,
  tokens,
  type SearchBoxChangeEvent,
  type InputOnChangeData,
} from '@fluentui/react-components';
import { ArrowLeftRegular } from '@fluentui/react-icons';
import type { ColumnDef, FocusedViewField, NestedConfig } from '../../types';
import type { V9FocusedViewGridProps } from '../types';
import { buildCellProps, getFieldValue, defaultGetKey, type GridRenderContext } from '../../adapters/context';
import { deriveIsNarrow } from '../../core';
import { useContainerWidth } from '../../hosts/useContainerWidth';
import { createV9CellRegistry } from '../cells/registry';
import { DataGrid } from './DataGrid';
import { CHILDREN_LOAD_ERROR, childrenError } from '../../hosts/nested/useChildren';

const railItemBase: CSSProperties = {
  padding: '10px 12px',
  borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  cursor: 'pointer',
};
const detailRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  padding: '6px 0',
  borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
  fontSize: 13,
};

export function FocusedViewGrid<T extends Record<string, unknown>>(props: V9FocusedViewGridProps<T>): JSX.Element {
  const { items, columns, focusedView, nested, registry: registryProp, onActiveItemChanged, navigateTo, getKey, height, look } = props;

  const defaultRegistry = useMemo(() => createV9CellRegistry(), []);
  const registry = registryProp ?? defaultRegistry;
  const getKeyFn = getKey ?? defaultGetKey;
  const ctx = useMemo<GridRenderContext<T>>(
    () => ({ registry, editable: false, getKey: getKeyFn, navigateTo }),
    [registry, getKeyFn, navigateTo],
  );

  const [activeKey, setActiveKey] = useState<string | undefined>(() => (items[0] ? getKeyFn(items[0]) : undefined));
  const [search, setSearch] = useState('');
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
    const fields = focusedView.rows.flatMap(
      (r) => [r.primaryField.fieldName, r.secondaryField?.fieldName].filter(Boolean) as string[],
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
  const select = (item: T): void => {
    setActiveKey(getKeyFn(item));
    onActiveItemChanged?.(item);
  };
  const renderDetailValue = (col: ColumnDef<T>, item: T): React.ReactNode => {
    const cellProps = buildCellProps(col, item, ctx);
    const Renderer = ctx.registry.resolve(col, false);
    return <Renderer {...cellProps} />;
  };

  const muted = { color: tokens.colorNeutralForeground3 };

  const railNode = (
    <div
      style={{
        width: isNarrow ? '100%' : 320,
        minWidth: isNarrow ? undefined : 260,
        borderRight: isNarrow ? undefined : `1px solid ${tokens.colorNeutralStroke2}`,
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: 8, borderBottom: `1px solid ${tokens.colorNeutralStroke2}` }}>
        <SearchBox
          placeholder="Search"
          style={{ width: '100%' }}
          onChange={(_e: SearchBoxChangeEvent, data: InputOnChangeData) => setSearch(data.value)}
        />
      </div>
      {filtered.map((item) => {
        const key = getKeyFn(item);
        const isActive = key === activeKey;
        return (
          <div
            key={key}
            style={{
              ...railItemBase,
              background: isActive ? tokens.colorBrandBackground2 : undefined,
              borderLeft: `3px solid ${isActive ? tokens.colorCompoundBrandStroke : 'transparent'}`,
            }}
            onClick={() => select(item)}
          >
            {focusedView.rows.map((row) => (
              <div key={row.id}>
                <Text size={300} weight="semibold">
                  {fieldText(item, row.primaryField)}
                </Text>
                {row.secondaryField && (
                  <Text size={200} style={{ ...muted, paddingLeft: 6 }}>
                    {fieldText(item, row.secondaryField)}
                  </Text>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  const detailNode = (
    <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
      {isNarrow && active && (
        <Button
          appearance="subtle"
          size="small"
          icon={<ArrowLeftRegular />}
          onClick={() => setActiveKey(undefined)}
          style={{ marginBottom: 8 }}
        >
          Back
        </Button>
      )}
      {!active ? (
        <Text size={300} style={muted}>
          Select a record to see its details.
        </Text>
      ) : focusedView.childOnly ? (
        nested ? (
          <DetailPaneChildren parent={active} nested={nested} look={look} />
        ) : (
          <Text size={300} style={muted}>
            No related records configured.
          </Text>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Text size={500} weight="semibold" style={{ marginBottom: 8 }}>
            {fieldText(active, focusedView.rows[0]?.primaryField)}
          </Text>
          {detailColumns.map((col) => (
            <div key={col.key} style={detailRowStyle}>
              <Text size={200} style={muted}>
                {col.name}
              </Text>
              <span>{renderDetailValue(col, active)}</span>
            </div>
          ))}
          {nested && nested.mode === 'detail-pane' && (
            <div style={{ paddingTop: 16 }}>
              <Text size={400} weight="semibold">
                Related
              </Text>
              <DetailPaneChildren parent={active} nested={nested} look={look} />
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div ref={rootRef}>
      <div
        style={{
          display: 'flex',
          flexDirection: isNarrow ? 'column' : 'row',
          border: `1px solid ${tokens.colorNeutralStroke2}`,
          borderRadius: tokens.borderRadiusMedium,
          height: height ?? 460,
          overflow: 'hidden',
        }}
      >
        {(!isNarrow || !active) && railNode}
        {(!isNarrow || active) && detailNode}
      </div>
    </div>
  );
}

/** Resolves + renders the detail-pane child grid (a v9 DataGrid) for the active record. */
function DetailPaneChildren<T extends Record<string, unknown>>(props: {
  parent: T;
  nested: NestedConfig<T>;
  /** The host's look — passed to the child grid explicitly (never inherited by accident, never dropped). */
  look?: 'default' | 'ce';
}): JSX.Element {
  const { parent, nested, look } = props;
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  // ★ A sync throw or a rejected promise used to leave "Loading…" up forever. Choosing ANOTHER record retries
  //   (the effect re-runs on a new `parent`); re-selecting the active one does not.
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
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
  }, [parent, nested, nested.reloadToken]);

  if (error !== undefined) return <span role="alert" data-gridkit-children-error="">{CHILDREN_LOAD_ERROR}</span>;
  if (rows === null) return <Text size={200}>Loading…</Text>;
  return (
    <DataGrid
      items={rows}
      columns={nested.childColumns}
      registry={nested.childRegistry}
      look={look}
      compact
      selectionMode={nested.childSelectionMode}
      onSelectionChanged={
        nested.onChildSelectionChanged ? (sel) => nested.onChildSelectionChanged!(parent, sel) : undefined
      }
      editable={nested.childEditable}
      editTrigger={nested.childEditTrigger}
      onValueChange={
        nested.onChildValueChange ? (rk, fn, v, ov) => nested.onChildValueChange!(parent, rk, fn, v, ov) : undefined
      }
    />
  );
}
