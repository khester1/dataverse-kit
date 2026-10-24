import React, { useCallback, useMemo, useState } from 'react';
import { Checkbox, IconButton, Spinner, Stack, Text } from '@fluentui/react';
import type { ColumnDef, NestedGridProps } from '../../types';
import { buildCellProps, GridRenderContext } from '../../adapters';
import { DataGrid } from '../DataGrid';
import { GridToolbar } from '../toolbar/GridToolbar';
import { GridAggregateFooter } from '../GridAggregateFooter';
import { GridPaginationFooter } from '../GridPaginationFooter';
import { fillStackStyles, FillRegion } from '../fill';
import { cardClass, cardImageClass, bodyRowClass, resolveCardLayout, cardGridStyle, CARD_GRID_GAP } from '../cardLayout';
import { useRowContextMenu } from '../useRowContextMenu';
import { useChildren, CHILDREN_LOAD_ERROR } from './useChildren';
import { hasAggregate as declaresAggregate } from '../../core/aggregate';

/**
 * Card-parent nested grid (`parentLayout: 'cards'`): each parent row renders as a
 * card that expands IN PLACE to reveal its child grid below the card fields. Reuses
 * the shared card layout (`resolveCardLayout` + classes) for the card body and the
 * lazy `useChildren` hook for child resolution (grid-kit never fetches). v8-only.
 *
 * `nested.mode` does NOT apply to card parents — `<NestedGrid>` routes here on
 * `parentLayout === 'cards'` BEFORE the mode discriminator, so the side-panel /
 * hover-callout trigger machinery is bypassed.
 *
 * v1 limitation: `childSelectionGating: 'requires-parent'` is unsupported here — cards
 * use a manual checkbox `Set`, not a Fluent DetailsList `Selection` to gate against —
 * so it's treated as `'independent'` with a one-time `console.warn`.
 */
export function NestedCardParent<
  T extends Record<string, unknown>,
  C extends Record<string, unknown>,
>(props: {
  parentProps: NestedGridProps<T, C>;
  ctx: GridRenderContext<T>;
  getKeyFn: (it: T) => string;
}): JSX.Element {
  const { parentProps, ctx, getKeyFn } = props;
  const {
    items,
    columns,
    nested,
    selectionMode = 'none',
    onSelectionChanged,
    toolbar,
    pagination,
    onPageChange,
    aggregateItems,
    fill,
    height,
    rowCommands,
  } = parentProps;

  // Per-row right-click menu (parity with DataGrid/NestedInline). For these raw-div
  // cards we invoke the hook fn from a native onContextMenu and suppress the browser
  // menu with e.preventDefault() ourselves (the hook's `return false` only matters to
  // Fluent's DetailsList onItemContextMenu contract).
  const { onItemContextMenu, contextMenuElement } = useRowContextMenu<T>(rowCommands);

  const { cardsPerRow, minCardWidth, titleField, subtitleField, imageField, cardHeight, byField, bodyColumns } =
    useMemo(() => resolveCardLayout(columns, nested.parentCard), [columns, nested.parentCard]);

  // Parent footers (parity with NestedInline / CardGrid): aggregate row when any
  // parent column declares an `aggregate`, then the pager. No DetailsList leading
  // control columns on a card grid, so the aggregate footer has no leading spacer.
  const hasAggregate = columns.some(declaresAggregate);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { get, ensure } = useChildren<T, C>(nested.getChildren, nested.reloadToken);

  // requires-parent gating needs a Fluent Selection over the parent rows; cards have
  // none, so surface the unsupported config and fall back to independent selection.
  React.useEffect(() => {
    if (nested.childSelectionGating === 'requires-parent' && typeof console !== 'undefined') {
      console.warn(
        "[grid-kit] childSelectionGating 'requires-parent' is unsupported for card parents (cards have no Fluent Selection); treating as 'independent'."
      );
    }
  }, [nested.childSelectionGating]);

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

  const toggleExpand = useCallback(
    (key: string, item: T) => {
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else {
          next.add(key);
          ensure(key, item);
        }
        return next;
      });
    },
    [ensure]
  );

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
            const open = expanded.has(key);
            const entry = open ? get(key) : undefined;
            return (
              <div
                key={key}
                className={cardClass}
                style={cardHeight ? { height: cardHeight } : undefined}
                onClick={() => toggleExpand(key, item)}
                // Right-click anywhere on the card opens its row menu. The card is the
                // row-equivalent target, so the title/body cells, chevron, and checkbox
                // below keep only their onClick stopPropagation — a right-click on them
                // intentionally bubbles here (preventDefault suppresses the browser/anchor
                // menu). Do NOT add onContextMenu guards there or the menu dies on cells.
                // The expanded child region DOES stop it (see below).
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
                  <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 4 }}>
                    <IconButton
                      iconProps={{ iconName: open ? 'ChevronDown' : 'ChevronRight' }}
                      ariaLabel={open ? 'Collapse' : 'Expand'}
                      styles={{ root: { height: 24, width: 24 } }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(key, item);
                      }}
                    />
                    <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                      {/* An interactive title (e.g. a link/lookup primary column) shouldn't
                          ALSO toggle the card — guard it like the body cells. */}
                      <span onClick={(e) => e.stopPropagation()}>
                        {renderField(byField.get(titleField ?? ''), item) ?? rawValue(item, titleField)}
                      </span>
                    </Text>
                  </Stack>
                  {selectionMode !== 'none' && (
                    // Stop the click from bubbling to the card's expand toggle.
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
                    {/* Cell value clicks shouldn't toggle the card. */}
                    <span onClick={(e) => e.stopPropagation()}>{renderField(col, item)}</span>
                  </div>
                ))}
                {open && (
                  <div
                    style={{ paddingTop: 8, marginTop: 4, borderTop: '1px solid #edebe9' }}
                    onClick={(e) => e.stopPropagation()}
                    // The child <DataGrid> renders INSIDE this card's DOM, so a right-click
                    // on a child row would otherwise bubble to the card's onContextMenu and
                    // fire the PARENT card's menu for the wrong record (the #93 / 2a8ff381
                    // lesson; mirrors NestedInline's inline child-region guard). Children
                    // have no own menu in v1 → the native browser menu is left intact here.
                    onContextMenu={(e) => e.stopPropagation()}
                  >
                    {!entry || entry.loading ? (
                      <Spinner label="Loading related records…" />
                    ) : entry.error !== undefined ? (
                      <span role="alert" data-gridkit-children-error="">{CHILDREN_LOAD_ERROR}</span>
                    ) : (
                      <DataGrid<C>
                        items={entry.rows}
                        columns={nested.childColumns}
                        registry={nested.childRegistry}
                        compact
                        selectionMode={nested.childSelectionMode}
                        onSelectionChanged={
                          nested.onChildSelectionChanged
                            ? (sel) => nested.onChildSelectionChanged!(item, sel)
                            : undefined
                        }
                        editable={nested.childEditable}
                        editTrigger={nested.childEditTrigger}
                        onValueChange={
                          nested.onChildValueChange
                            ? (rk, fn, v, ov) => nested.onChildValueChange!(item, rk, fn, v, ov)
                            : undefined
                        }
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </FillRegion>
      {hasAggregate && (
        <GridAggregateFooter items={aggregateItems ?? items} columns={columns} leadingSpacer={0} />
      )}
      {pagination && <GridPaginationFooter pagination={pagination} onPageChange={onPageChange} />}
      {contextMenuElement}
    </Stack>
  );
}
