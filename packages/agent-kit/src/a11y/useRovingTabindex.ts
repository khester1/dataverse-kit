import * as React from 'react';

export interface RovingTabindexOptions {
  orientation?: 'horizontal' | 'vertical';
  loop?: boolean;
  itemCount: number;
  onActivate?: (index: number) => void;
}

export interface RovingTabindex {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  /** Spread onto each item. Exactly ONE item is tabbable at a time. */
  getItemProps: (index: number) => {
    tabIndex: 0 | -1;
    'data-roving-item': true;
    onFocus: () => void;
    onKeyDown: (event: React.KeyboardEvent) => void;
  };
}

/**
 * One tab stop for a group, arrow keys within it — the WAI-ARIA roving tabindex.
 *
 * ★ Why this rather than Fluent's `Toolbar`: `react-toolbar` reaches
 *   `useArrowNavigationGroup` → `getMover` → `core.attrHandlers.set`, which throws against a
 *   Dynamics form's tabster (8.2.0, no `attrHandlers`) and unmounts the React tree. For a row
 *   of buttons the ARIA pattern is ~40 lines, so this is the cheap side of the split-by-cost
 *   decision; `TabList` and `Tree` are the expensive side and the kit uses Fluent's.
 *
 * ★ Without a roving index a transcript of 20 messages × 4 hover actions is 80 tab stops.
 */
export function useRovingTabindex(options: RovingTabindexOptions): RovingTabindex {
  const { orientation = 'horizontal', loop = true, itemCount, onActivate } = options;
  const [activeIndex, setActiveIndex] = React.useState(0);

  const clamp = React.useCallback(
    (index: number) => {
      if (itemCount === 0) return 0;
      return loop
        ? (index + itemCount) % itemCount
        : Math.min(Math.max(index, 0), itemCount - 1);
    },
    [itemCount, loop],
  );

  const getItemProps = React.useCallback(
    (index: number) => ({
      tabIndex: (index === activeIndex ? 0 : -1) as 0 | -1,
      'data-roving-item': true as const,
      onFocus: () => setActiveIndex(index),
      onKeyDown: (event: React.KeyboardEvent) => {
        const prevKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
        const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';

        let target: number | null = null;
        if (event.key === nextKey) target = clamp(index + 1);
        else if (event.key === prevKey) target = clamp(index - 1);
        else if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = itemCount - 1;
        else if (event.key === 'Enter' || event.key === ' ') {
          onActivate?.(index);
          return;
        }
        if (target === null) return;

        event.preventDefault();
        event.stopPropagation();
        setActiveIndex(target);
        const group = (event.currentTarget as HTMLElement).parentElement;
        group?.querySelectorAll<HTMLElement>('[data-roving-item]')[target]?.focus();
      },
    }),
    [activeIndex, clamp, itemCount, onActivate, orientation],
  );

  return { activeIndex, setActiveIndex, getItemProps };
}
