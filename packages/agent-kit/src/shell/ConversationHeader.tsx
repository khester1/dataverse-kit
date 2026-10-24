import * as React from 'react';
import {
  Button, Menu, MenuTrigger, MenuPopover, MenuList, MenuItem, Tab, TabList, Text,
  makeStyles, tokens,
} from '@fluentui/react-components';
import { MoreHorizontalRegular } from '@fluentui/react-icons';
import type { AgentParticipant } from '../core';
import type { PresenceState } from './types';
import { AgentAvatar } from './AgentAvatar';

export interface ConversationTab {
  id: string;
  label: string;
}

export interface HeaderAction {
  key: string;
  label: string;
  icon?: React.ReactElement;
  onClick: () => void;
}

export interface ConversationHeaderProps {
  title: string;
  subtitle?: string;
  participant?: AgentParticipant;
  presence?: PresenceState;
  tabs?: readonly ConversationTab[];
  selectedTabId?: string;
  onTabSelect?: (id: string) => void;
  actions?: readonly HeaderAction[];
  /** Rendered right of the tabs — a search box, a right-pane toggle. */
  trailing?: React.ReactNode;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM} 0`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  top: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
  identity: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, minWidth: 0 },
  titles: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  subtitle: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  spacer: { flex: 1 },
  tabRow: { display: 'flex', alignItems: 'flex-end', gap: tokens.spacingHorizontalS },
});

/**
 * The bar above the transcript: who you are talking to, the tab strip, and the actions.
 *
 * ★★ The tab strip is Fluent's real `TabList`, and that is DELIBERATE. `react-tabs` reaches
 *    `useArrowNavigationGroup` → `getMover` → tabster, but rebuilding it by hand is not the
 *    "simple horizontal list" it looks like: tabster's Mover carries RTL inversion,
 *    Home/End/PageUp/PageDown, cyclic wrap, disabled-item skipping, and a caret-position guard
 *    that declines arrow keys while the caret is inside a text input — roughly 120-180 LOC to
 *    reproduce, against a widget nobody has tested. Per the split-by-cost decision the kit uses
 *    Fluent's and the PCF host supplies an isolated `targetDocument`; the coexistence spike
 *    measured that two tabster cores share a window without double-handling.
 *
 * ★ Manual activation (Fluent's default, `selectTabOnFocus` off): arrowing through the tabs must
 *   not fire N conversation loads on the way past.
 *
 * ★ `aria-controls` is NOT set here. The panel these tabs govern is rendered by the consumer,
 *   elsewhere in the tree, so the id contract would have to cross components — and an
 *   `aria-controls` pointing at nothing is worse than none. Pass `panelId` when that contract
 *   exists; until then the relationship is left unstated rather than stated falsely.
 */
export function ConversationHeader(props: ConversationHeaderProps): React.ReactElement {
  const {
    title, subtitle, participant, presence, tabs, selectedTabId, onTabSelect, actions, trailing,
  } = props;
  const styles = useStyles();

  const inline = (actions ?? []).slice(0, 2);
  const overflow = (actions ?? []).slice(2);

  return (
    <header className={styles.root}>
      <div className={styles.top}>
        <div className={styles.identity}>
          <AgentAvatar participant={participant} presence={presence} size={32} name={title} />
          <div className={styles.titles}>
            <Text weight="semibold" truncate wrap={false}>
              {title}
            </Text>
            {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
          </div>
        </div>

        <div className={styles.spacer} />
        {trailing}

        {inline.map((action) => (
          <Button
            key={action.key}
            appearance="subtle"
            size="small"
            icon={action.icon}
            aria-label={action.label}
            onClick={action.onClick}
          />
        ))}

        {overflow.length > 0 ? (
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button
                appearance="subtle"
                size="small"
                icon={<MoreHorizontalRegular />}
                aria-label={`More actions, ${overflow.length} available`}
              />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {overflow.map((action) => (
                  <MenuItem key={action.key} icon={action.icon} onClick={action.onClick}>
                    {action.label}
                  </MenuItem>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
        ) : null}
      </div>

      {tabs && tabs.length > 0 ? (
        <div className={styles.tabRow}>
          <TabList
            selectedValue={selectedTabId}
            onTabSelect={(_, data) => onTabSelect?.(data.value as string)}
            size="small"
          >
            {tabs.map((tab) => (
              <Tab key={tab.id} value={tab.id}>
                {tab.label}
              </Tab>
            ))}
          </TabList>
        </div>
      ) : null}
    </header>
  );
}
