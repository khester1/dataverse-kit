import * as React from 'react';
import { makeStyles, tokens, Text } from '@fluentui/react-components';
import type { ConversationSummary } from './types';
import { ConversationListItem } from './ConversationListItem';

export interface ConversationListProps {
  items: readonly ConversationSummary[];
  selectedId?: string;
  onSelect: (id: string) => void;
  label?: string;
  locale?: string;
  empty?: React.ReactNode;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: tokens.spacingHorizontalXS,
    overflowY: 'auto',
    minHeight: 0,
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '-2px' },
  },
  empty: { padding: tokens.spacingVerticalM, color: tokens.colorNeutralForeground3 },
});

/**
 * The chat list.
 *
 * ★★ A LISTBOX with `aria-activedescendant`, not a stack of buttons and not a `Tree`.
 *
 *    A bare button list is not a simpler tree — it is a widget with no collection semantics at
 *    all: N tab stops, no selected state, no set size or position, no arrow navigation. A
 *    listbox is ONE tab stop, Up/Down/Home/End move an active option, and `aria-selected` says
 *    which conversation is open.
 *
 *    `Tree` would be right if this nested (teams → channels); it does not — see ./types.ts,
 *    where that decision is written down.
 *
 * ★ Modelled on the estate's existing activedescendant listbox
 *   (`shared/pcf-gallery/controls/choice-grid/.../ChoiceGridApp.tsx`), including the detail that
 *   `scrollIntoView` is guarded on the METHOD (`?.()`), not just the element: it is not
 *   implemented everywhere a React tree runs, and an unguarded call inside an effect does not
 *   degrade — it throws, React unmounts, and the list renders nothing.
 */
export function ConversationList(props: ConversationListProps): React.ReactElement {
  const { items, selectedId, onSelect, label = 'Conversations', locale, empty } = props;
  const styles = useStyles();
  const listRef = React.useRef<HTMLDivElement>(null);
  const idBase = React.useId();

  const selectedIndex = Math.max(0, items.findIndex((i) => i.id === selectedId));
  const [active, setActive] = React.useState(selectedIndex);

  // Follow an externally-driven selection, and never point past the end if the list shrinks.
  React.useEffect(() => {
    setActive((current) => {
      if (items.length === 0) return 0;
      if (selectedIndex >= 0 && items[selectedIndex]) return selectedIndex;
      return Math.min(current, items.length - 1);
    });
  }, [selectedIndex, items]);

  const optionId = (index: number) => `${idBase}-opt-${index}`;

  React.useEffect(() => {
    // ★ getElementById, not querySelector('#id'): React useId values contain colons, and jsdom
    //   does not expose CSS.escape to sanitise them.
    // ★★ The optional call is on the METHOD. `scrollIntoView` is not implemented everywhere a
    //    React tree runs — jsdom being the obvious case — and an unguarded call inside an effect
    //    does not degrade: it THROWS, React unmounts, and the list renders nothing at all. A
    //    cosmetic nicety must never be able to take the shell down.
    const el = listRef.current?.ownerDocument.getElementById(optionId(active));
    el?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, idBase]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = items.length - 1;
    if (last < 0) return;
    let next: number | null = null;
    if (event.key === 'ArrowDown') next = Math.min(last, active + 1);
    else if (event.key === 'ArrowUp') next = Math.max(0, active - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const picked = items[active];
      // The list can shrink while focus is held; checking the ENTRY rather than defaulting the
      // id makes that a no-op instead of selecting something wrong.
      if (picked) onSelect(picked.id);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setActive(next);
  };

  if (items.length === 0) {
    return (
      <div className={styles.root}>
        {empty ?? (
          <Text className={styles.empty} size={200}>
            No conversations yet.
          </Text>
        )}
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className={styles.root}
      role="listbox"
      aria-label={label}
      // ONE tab stop for the whole list.
      tabIndex={0}
      aria-activedescendant={optionId(active)}
      onKeyDown={onKeyDown}
    >
      {items.map((summary, index) => (
        <ConversationListItem
          key={summary.id}
          id={optionId(index)}
          summary={summary}
          selected={summary.id === selectedId}
          active={index === active}
          locale={locale}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
