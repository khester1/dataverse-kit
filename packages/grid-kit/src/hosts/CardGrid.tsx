import React, { useMemo, useState } from 'react';
import { Checkbox, Stack, Text } from '@fluentui/react';
import type { CardGridProps, ColumnDef } from '../types';
import { buildCellProps } from '../adapters';
import { useEditState } from './useEditState';
import { useGridContext } from './useGridContext';
import { GridToolbar } from './toolbar/GridToolbar';
import { GridPaginationFooter } from './GridPaginationFooter';
import { fillStackStyles, FillRegion } from './fill';
import { cardClass, cardImageClass, bodyRowClass, resolveCardLayout, cardGridStyle, CARD_GRID_GAP } from './cardLayout';
import { useRowContextMenu } from './useRowContextMenu';

/**
 * Card-view grid host. Renders each row as a card; every field value goes
 * through the SAME cell registry as `<DataGrid>` (so status badges, currency,
 * ratings, etc. look identical). Mirrors the Grid Customizer's "Card List" type.
 *
 * Selection is checkbox-based (manual Set), independent of Fluent's DetailsList
 * Selection. `rowCommands` adds a per-card right-click context menu (parity with
 * `DataGrid` / `NestedCardParent`), suppressing the native browser menu.
 */
export function CardGrid<T extends Record<string, unknown>>(props: CardGridProps<T>): JSX.Element {
  const {
    items,
    columns,
    card,
    selectionMode = 'none',
    onSelectionChanged,
    toolbar,
    pagination,
    onPageChange,
    onActiveItemChanged,
    fill,
    height,
    rowCommands,
  } = props;

  // Per-row right-click menu (parity with DataGrid / NestedCardParent). For these
  // raw-div cards we invoke the hook fn from a native onContextMenu and suppress the
  // browser menu with e.preventDefault() ourselves (the hook's `return false` only
  // matters to Fluent's DetailsList onItemContextMenu contract). CardGrid is FLAT — no
  // nested child region — so (unlike NestedCardParent) nothing needs contextmenu
  // stopPropagation.
  const { onItemContextMenu, contextMenuElement } = useRowContextMenu<T>(rowCommands);

  const edit = useEditState();
  const { getKeyFn, ctx } = useGridContext<T>(props, edit);

  // Card layout derivation is shared (and unit-tested) via resolveCardLayout —
  // identical to the prior inline derivation, so rendered output is unchanged.
  const { cardsPerRow, minCardWidth, titleField, subtitleField, imageField, cardHeight, byField, bodyColumns } =
    useMemo(() => resolveCardLayout(columns, card), [columns, card]);

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

  const toggleSelect = (item: T, checked?: boolean) => {
    const key = getKeyFn(item);
    setSelected((prev) => {
      const next = new Set(selectionMode === 'single' ? [] : prev);
      if (checked) next.add(key);
      else next.delete(key);
      onSelectionChanged?.(items.filter((it) => next.has(getKeyFn(it))));
      return next;
    });
  };

  return (
    <Stack styles={fillStackStyles(fill, height)}>
      {toolbar && <GridToolbar config={toolbar} />}
      <FillRegion fill={fill}>
      <div
        style={{
          display: 'grid',
          gap: CARD_GRID_GAP,
          paddingTop: 4,
          ...cardGridStyle(cardsPerRow, minCardWidth),
        }}
      >
        {items.map((item) => {
          const key = getKeyFn(item);
          return (
            <div
              key={key}
              className={cardClass}
              style={cardHeight ? { height: cardHeight } : undefined}
              onClick={() => onActiveItemChanged?.(item)}
              // Right-click anywhere on the card opens its row menu. The card is the
              // row-equivalent target: the title/body cells have no handler to intercept
              // it, and the selection checkbox below only stops LEFT-click (its onClick
              // stopPropagation), so a right-click on any of them bubbles here
              // (preventDefault suppresses the browser menu).
              onContextMenu={
                onItemContextMenu
                  ? (e) => {
                      e.preventDefault();
                      onItemContextMenu(item, undefined, e.nativeEvent);
                    }
                  : undefined
              }
            >
              <Stack horizontal horizontalAlign="space-between" verticalAlign="start">
                <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                  {renderField(byField.get(titleField ?? ''), item) ?? rawValue(item, titleField)}
                </Text>
                {selectionMode !== 'none' && (
                  // Stop the click from bubbling to the card's onActiveItemChanged.
                  <span onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(key)}
                      onChange={(_, checked) => toggleSelect(item, checked)}
                      ariaLabel="Select card"
                    />
                  </span>
                )}
              </Stack>
              {imageField && rawValue(item, imageField) && (
                <img className={cardImageClass} src={rawValue(item, imageField)} alt="" />
              )}
              {subtitleField && (
                <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                  {rawValue(item, subtitleField)}
                </Text>
              )}
              {bodyColumns.map((col) => (
                <div key={col.key} className={bodyRowClass}>
                  <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
                    {col.name}
                  </Text>
                  <span>{renderField(col, item)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      </FillRegion>
      {pagination && <GridPaginationFooter pagination={pagination} onPageChange={onPageChange} />}
      {contextMenuElement}
    </Stack>
  );
}
