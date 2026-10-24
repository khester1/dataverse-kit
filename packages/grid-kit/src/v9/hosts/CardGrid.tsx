/**
 * The Fluent UI v9 card-view grid host — the v9 counterpart of the v8 `<CardGrid>`.
 * Renders each row as a v9 `<Card>`; every field value goes through the SAME v9 cell
 * registry + `buildCellProps` as the v9 `<DataGrid>` (badges/currency/ratings render
 * identically). Cards are READ-ONLY (`registry.resolve(col, false)`). Layout comes from
 * the pure `cardGridStyle`/`resolveCardLayout` (fixed `cardsPerRow` grid, or a responsive
 * reflow when `card.minCardWidth` is set). Selection is checkbox-based (a manual Set).
 *
 * Per-row right-click commands are deferred (v9 has no `ContextualMenu`; the v9 read
 * DataGrid shipped without them too) — a follow-on v9 increment.
 */
import React, { useMemo, useState, type CSSProperties } from 'react';
import { Card, Checkbox, Text, tokens, type CheckboxOnChangeData } from '@fluentui/react-components';
import type { ColumnDef } from '../../types';
import type { V9CardGridProps } from '../types';
import { buildCellProps, defaultGetKey, type GridRenderContext } from '../../adapters/context';
import { createV9CellRegistry } from '../cells/registry';
import { GridToolbar } from './GridToolbar';
import { GridPaginationFooter } from './footers';
import { resolveCardLayout, cardGridStyle, CARD_GRID_GAP } from './cardLayout';

export function CardGrid<T extends Record<string, unknown>>(props: V9CardGridProps<T>): JSX.Element {
  const {
    items,
    columns,
    card,
    registry: registryProp,
    selectionMode = 'none',
    onSelectionChanged,
    toolbar,
    pagination,
    onPageChange,
    onActiveItemChanged,
    navigateTo,
    getKey,
    height,
  } = props;

  const defaultRegistry = useMemo(() => createV9CellRegistry(), []);
  const registry = registryProp ?? defaultRegistry;
  const getKeyFn = getKey ?? defaultGetKey;
  const ctx = useMemo<GridRenderContext<T>>(
    () => ({ registry, editable: false, getKey: getKeyFn, navigateTo }),
    [registry, getKeyFn, navigateTo],
  );

  const { cardsPerRow, minCardWidth, titleField, subtitleField, imageField, cardHeight, byField, bodyColumns } = useMemo(
    () => resolveCardLayout(columns, card),
    [columns, card],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const renderField = (col: ColumnDef<T> | undefined, item: T): React.ReactNode => {
    if (!col) return null;
    const cellProps = buildCellProps(col, item, ctx);
    const Renderer = ctx.registry.resolve(col, false); // cards render read-only
    return <Renderer {...cellProps} />;
  };
  const rawValue = (item: T, field?: string): string => {
    if (!field) return '';
    const v = (item as Record<string, unknown>)[field];
    return v == null ? '' : String(v);
  };

  const toggleSelect = (item: T, checked: boolean): void => {
    const key = getKeyFn(item);
    setSelected((prev) => {
      const next = new Set(selectionMode === 'single' ? [] : prev);
      if (checked) next.add(key);
      else next.delete(key);
      onSelectionChanged?.(items.filter((it) => next.has(getKeyFn(it))));
      return next;
    });
  };

  const rootStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    ...(height !== undefined ? { height, minHeight: 0 } : {}),
  };

  return (
    <div style={rootStyle}>
      {toolbar && <GridToolbar config={toolbar} />}
      <div style={height !== undefined ? { flex: 1, minHeight: 0, overflow: 'auto' } : undefined}>
        <div style={{ display: 'grid', gap: CARD_GRID_GAP, paddingTop: 4, ...cardGridStyle(cardsPerRow, minCardWidth) }}>
          {items.map((item) => {
            const key = getKeyFn(item);
            return (
              <Card
                key={key}
                appearance="outline"
                onClick={onActiveItemChanged ? () => onActiveItemChanged(item) : undefined}
                style={{ gap: 6, ...(cardHeight ? { height: cardHeight } : {}) }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <Text weight="semibold" size={400} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {renderField(byField.get(titleField ?? ''), item) ?? rawValue(item, titleField)}
                  </Text>
                  {selectionMode !== 'none' && (
                    <span onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(key)}
                        onChange={(_e, data: CheckboxOnChangeData) => toggleSelect(item, data.checked === true)}
                        aria-label="Select card"
                      />
                    </span>
                  )}
                </div>
                {imageField && rawValue(item, imageField) && (
                  <img
                    src={rawValue(item, imageField)}
                    alt=""
                    style={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 2, marginBottom: 4 }}
                  />
                )}
                {subtitleField && (
                  <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                    {rawValue(item, subtitleField)}
                  </Text>
                )}
                {bodyColumns.map((col) => (
                  <div
                    key={col.key}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 13 }}
                  >
                    <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                      {col.name}
                    </Text>
                    <span>{renderField(col, item)}</span>
                  </div>
                ))}
              </Card>
            );
          })}
        </div>
      </div>
      {pagination && <GridPaginationFooter pagination={pagination} onPageChange={onPageChange} />}
    </div>
  );
}
