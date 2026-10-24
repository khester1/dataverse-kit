import * as React from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import type { ConversationSummary } from './types';
import { AgentAvatar } from './AgentAvatar';

export interface ConversationListItemProps {
  summary: ConversationSummary;
  selected: boolean;
  active: boolean;
  id: string;
  locale?: string;
  onSelect: (id: string) => void;
}

const useStyles = makeStyles({
  row: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center',
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalS}`,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  // ★ The ACTIVE row (aria-activedescendant target) gets a visible focus indicator, because
  //   real DOM focus stays on the listbox — without this the keyboard user sees nothing move.
  active: { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '-2px' },
  selected: { backgroundColor: tokens.colorNeutralBackground1Selected },
  body: { flex: 1, minWidth: 0 },
  title: {
    display: 'block',
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  muted: { fontWeight: tokens.fontWeightRegular, color: tokens.colorNeutralForeground3 },
  preview: {
    display: 'block',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' },
  time: { fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 },
  unread: {
    minWidth: '18px',
    height: '18px',
    padding: `0 ${tokens.spacingHorizontalXXS}`,
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: tokens.fontSizeBase100,
    lineHeight: '18px',
    textAlign: 'center',
  },
});

/**
 * Build the row's accessible name.
 *
 * ★★ Unread count and presence go in the NAME, not only in a badge and a colour dot. A screen
 *    reader hearing "Contoso" forty times learns nothing about which conversations are waiting,
 *    and a colour-only unread indicator is a WCAG 1.4.1 failure. Exported so it can be asserted
 *    directly rather than inferred from rendered markup.
 */
export function conversationAccessibleName(
  summary: ConversationSummary,
  locale?: string,
): string {
  const parts = [summary.title];
  if (summary.presence && summary.presence !== 'unknown') parts.push(summary.presence);
  if (!summary.muted && summary.unreadCount) {
    parts.push(`${summary.unreadCount} unread`);
  }
  if (summary.muted) parts.push('muted');
  if (summary.timestamp) {
    parts.push(new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(summary.timestamp)));
  }
  return parts.join(', ');
}

export function ConversationListItem(props: ConversationListItemProps): React.ReactElement {
  const { summary, selected, active, id, locale, onSelect } = props;
  const styles = useStyles();
  const time = summary.timestamp
    ? new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(summary.timestamp))
    : undefined;

  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      aria-label={conversationAccessibleName(summary, locale)}
      className={mergeClasses(styles.row, selected && styles.selected, active && styles.active)}
      onClick={() => onSelect(summary.id)}
      data-conversation-option
    >
      <AgentAvatar participant={summary.participant} presence={summary.presence} size={32} />
      {/* The visible text is aria-hidden: the row's own aria-label is the accessible name, and
          without this a screen reader reads the title twice. */}
      <div className={styles.body} aria-hidden="true">
        <span className={mergeClasses(styles.title, summary.muted && styles.muted)}>{summary.title}</span>
        {summary.preview ? <span className={styles.preview}>{summary.preview}</span> : null}
      </div>
      <div className={styles.meta} aria-hidden="true">
        {time ? <span className={styles.time}>{time}</span> : null}
        {!summary.muted && summary.unreadCount ? (
          <span className={styles.unread}>{summary.unreadCount}</span>
        ) : null}
      </div>
    </div>
  );
}
