import React, { useId, useState } from 'react';
import {
  TabList,
  Tab,
  makeStyles,
  tabClassNames,
  tokens,
  type SelectTabData,
  type SelectTabEvent,
} from '@fluentui/react-components';
import type { PivotSurfaceProps } from '../types';
import { ceForm } from '../../tokens';

// ★ The ce look is OPT-IN here (`look="ce"`), not inherited from FormSurface: it is page-level
//   chrome (a header card with page insets), so a pivot nested inside a ce Section must not become
//   a second header card. `appearance`/`size` are ignored under ce (transparent/large, measured).

/** Fluent's private class for the hidden semibold copy that reserves a tab's width. It is NOT
 *  exported by @fluentui/react-components; a test asserts it still exists after a Fluent bump. */
export const FLUENT_TAB_RESERVED_SPACE_CLASS = 'fui-Tab__content--reserved-space';

// ★ look="ce" is the MEASURED Dynamics header card + tab body (dynamics-ui-kit
//   apps/ce-parity/reference, `header.card`, `tabs.*`, `tabBody.*`): one card (shadow4, 8px
//   radius) holding the `header` region and the tab strip (padding 14/144/0/21, 45px tabs, 20px
//   apart, 16px text on a 28px line — NOT a Fluent ramp step — 600 when selected, a 3px brand
//   underline with 2px radius 5px above the tab's bottom edge). The selected tab's content renders
//   BELOW the card in the tab body (16px top, 21px bottom). The page insets (8px left, 20px right)
//   apply to card and body alike, as they do in Dynamics.

const T = ceForm.tabs;
// The underline's bottom edge sits 5px above the tab box's bottom (underline 236.5–239.5 in a tab
// box 199.5–244.5; the tab's measured padding-bottom is 5).
const UNDERLINE_BOTTOM = 5;

const useStyles = makeStyles({
  ceCard: {
    minWidth: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    border: '1px solid transparent',
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow4,
  },
  ceStrip: {
    padding: T.stripPadding.map((v) => `${v}px`).join(' '),
    columnGap: `${T.gap}px`,
    // PROVISIONAL: tabs that don't fit are clipped. Dynamics folds them into a "Related ▾" /
    // overflow menu, which is unmeasured and not modelled.
    overflow: 'hidden',
  },
  ceTab: {
    height: `${T.tabHeight}px`,
    padding: `0 0 ${UNDERLINE_BOTTOM}px`,
    alignItems: 'flex-end',
    fontSize: `${T.fontSize}px`,
    lineHeight: `${T.lineHeight}px`,
    color: tokens.colorNeutralForeground1,
    [`& .${tabClassNames.content}`]: {
      padding: 0,
      fontSize: `${T.fontSize}px`,
      lineHeight: `${T.lineHeight}px`,
      // Idle labels are the measured #242424 too (Fluent's transparent appearance would use
      // foreground2, #424242).
      color: tokens.colorNeutralForeground1,
    },
    // Dynamics, like Fluent, reserves each tab's SEMIBOLD width (a hidden zero-height copy of the
    // label), so tabs don't shift on selection: an unselected "Web API Probe" is 109.6 wide, its
    // semibold width in the same Segoe UI Web file. Fluent's reserved copy keeps its own 2px side
    // padding, which made it 113.6 — zero it like the visible content.
    [`& .${FLUENT_TAB_RESERVED_SPACE_CLASS}`]: {
      padding: 0,
      fontSize: `${T.fontSize}px`,
    },
    // Fluent draws the selected (and hover) indicator on ::after / ::before; move both to the
    // measured position and shape.
    '::after': {
      left: 0,
      right: 0,
      bottom: `${UNDERLINE_BOTTOM}px`,
      height: `${T.underlineHeight}px`,
      borderRadius: `${T.underlineRadius}px`,
    },
    '::before': {
      left: 0,
      right: 0,
      bottom: `${UNDERLINE_BOTTOM}px`,
      height: `${T.underlineHeight}px`,
      borderRadius: `${T.underlineRadius}px`,
    },
    // Fluent's hover/pressed indicator sets a circular radius at higher specificity; match it.
    ':hover::before': { borderRadius: `${T.underlineRadius}px` },
    ':active::before': { borderRadius: `${T.underlineRadius}px` },
  },
});

/** Tabbed surface (Fluent v9 `TabList`). Controlled via `selectedId`/`onTabChange` or uncontrolled. */
export const PivotSurface: React.FC<PivotSurfaceProps> = ({
  tabs,
  selectedId,
  defaultSelectedId,
  onTabChange,
  appearance = 'transparent',
  size = 'medium',
  className,
  look: lookProp,
  header,
}) => {
  const styles = useStyles();
  const ce = lookProp === 'ce';
  // Tab ↔ panel wiring (role=tabpanel, aria-controls/labelledby) — Fluent's TabList does not do it.
  const baseId = useId();
  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = `${baseId}-panel`;
  // Seed to the requested default, else the first *enabled* tab (don't open a disabled one).
  const firstEnabledId = tabs.find((t) => !t.disabled)?.id ?? tabs[0]?.id;
  const [internal, setInternal] = useState<string | undefined>(defaultSelectedId ?? firstEnabledId);
  const selected = selectedId ?? internal;

  const handleSelect = (_e: SelectTabEvent, data: SelectTabData) => {
    const id = String(data.value);
    if (selectedId == null) setInternal(id);
    onTabChange?.(id);
  };

  const active = tabs.find((t) => t.id === selected) ?? tabs[0];

  if (ce) {
    const [bodyTop, , bodyBottom] = ceForm.tabBody.padding;
    return (
      <div
        className={className}
        // minWidth 0: as a grid/flex child (FormSurface), the header's no-wrap content must not
        // widen the track — the card shrinks and the header clips/truncates inside it instead.
        style={{ padding: `0 ${ceForm.page.insetRight}px 0 ${ceForm.page.insetLeft}px`, minWidth: 0 }}
        data-surface-part="pivot"
        data-look="ce"
      >
        <div className={styles.ceCard} data-surface-part="header-card">
          {header}
          <TabList
            className={styles.ceStrip}
            selectedValue={selected}
            onTabSelect={handleSelect}
            appearance="transparent"
            size="large"
            data-surface-part="tab-strip"
          >
            {tabs.map((t) => (
              <Tab
                key={t.id}
                value={t.id}
                icon={t.icon}
                disabled={t.disabled}
                className={styles.ceTab}
                id={tabId(t.id)}
                aria-controls={t.id === active?.id ? panelId : undefined}
              >
                {t.label}
              </Tab>
            ))}
          </TabList>
        </div>
        <div
          role="tabpanel"
          id={panelId}
          aria-labelledby={active ? tabId(active.id) : undefined}
          style={{ paddingTop: bodyTop, paddingBottom: bodyBottom }}
          data-surface-part="tab-body"
        >
          {active?.content}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {header}
      <TabList selectedValue={selected} onTabSelect={handleSelect} appearance={appearance} size={size}>
        {tabs.map((t) => (
          <Tab
            key={t.id}
            value={t.id}
            icon={t.icon}
            disabled={t.disabled}
            id={tabId(t.id)}
            aria-controls={t.id === active?.id ? panelId : undefined}
          >
            {t.label}
          </Tab>
        ))}
      </TabList>
      <div role="tabpanel" id={panelId} aria-labelledby={active ? tabId(active.id) : undefined} data-surface-part="tab-body">
        {active?.content}
      </div>
    </div>
  );
};

export default PivotSurface;
