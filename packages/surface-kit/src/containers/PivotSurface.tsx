import React, { useState } from 'react';
import { Pivot, PivotItem, TooltipHost, type IPivotProps, type IPivotItemProps } from '@fluentui/react';
import type { PivotSurfaceProps, SurfaceTab } from '../types';

/** Tabbed surface (Fluent Pivot). Controlled via `selectedId`/`onTabChange` or uncontrolled. */
export const PivotSurface: React.FC<PivotSurfaceProps> = ({
  tabs,
  selectedId,
  defaultSelectedId,
  onTabChange,
  linkFormat = 'links',
  className,
}) => {
  // Seed to the requested default, else the first *enabled* tab (don't open a disabled one).
  const firstEnabledId = tabs.find((t) => !t.disabled)?.id ?? tabs[0]?.id;
  const [internal, setInternal] = useState<string | undefined>(defaultSelectedId ?? firstEnabledId);
  const selected = selectedId ?? internal;

  const handleLinkClick = (item?: PivotItem) => {
    const id = item?.props.itemKey;
    if (!id) return;
    // Guard: a disabled tab must not become the active tab (belt-and-braces —
    // Fluent already blocks the click, but controlled callers rely on this too).
    if (tabs.find((t) => t.id === id)?.disabled) return;
    if (selectedId == null) setInternal(id);
    onTabChange?.(id);
  };

  const active = tabs.find((t) => t.id === selected) ?? tabs[0];

  // Wrap a tab's rendered link in a TooltipHost when the tab declares a `tooltip`
  // (covers the icon + label). Returns undefined so Fluent uses its default render.
  const renderItemLink = (tab: SurfaceTab) =>
    tab.tooltip
      ? (props?: IPivotItemProps, defaultRender?: (p?: IPivotItemProps) => JSX.Element | null) => (
          <TooltipHost content={tab.tooltip}>{defaultRender?.(props)}</TooltipHost>
        )
      : undefined;

  return (
    <div className={className}>
      <Pivot
        selectedKey={selected}
        onLinkClick={handleLinkClick}
        linkFormat={linkFormat as IPivotProps['linkFormat']}
        headersOnly
      >
        {tabs.map((t) => (
          <PivotItem
            key={t.id}
            itemKey={t.id}
            headerText={t.label}
            itemIcon={t.iconName}
            onRenderItemLink={renderItemLink(t)}
            // Disabled tabs: block interaction AND read as disabled (Fluent's
            // headerButtonProps.disabled alone leaves them looking enabled).
            headerButtonProps={
              t.disabled
                ? { disabled: true, style: { opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' } }
                : undefined
            }
          />
        ))}
      </Pivot>
      <div>{active?.content}</div>
    </div>
  );
};

export default PivotSurface;
