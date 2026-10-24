import React from 'react';
import { mergeStyleSets, CommandBar, Icon } from '@fluentui/react';
import type { SectionHeaderProps } from '../types';
import { colors } from '../tokens/tokens';
import { sharedTitleStyle } from '../internal/styles';

// Ported from reusable-components section header: flex title + status on the left,
// overflow CommandBar on the right, Dynamics neutral underline. Adds a collapse chevron.

/** Section header bar: title + status (left), command bar / actions (right), optional collapse toggle. */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  statusText,
  showCommandBar,
  commandBarItems = [],
  actions,
  collapsible,
  collapsed,
  onToggle,
}) => {
  const styles = mergeStyleSets({
    root: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'nowrap',
      borderBottom: `1px solid ${colors.borderNeutral}`,
      marginBottom: 16,
      minHeight: 48,
      width: '100%',
    },
    left: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
    title: sharedTitleStyle,
    status: { marginLeft: 8, fontSize: '0.9em', color: colors.textSecondary },
    chevron: {
      cursor: 'pointer',
      border: 'none',
      background: 'transparent',
      padding: 4,
      display: 'flex',
      alignItems: 'center',
      color: colors.textSecondary,
    },
  });

  return (
    <div className={styles.root}>
      <div className={styles.left}>
        {collapsible && (
          <button
            type="button"
            className={styles.chevron}
            onClick={onToggle}
            aria-label={collapsed ? 'Expand section' : 'Collapse section'}
            aria-expanded={!collapsed}
          >
            <Icon iconName={collapsed ? 'ChevronRight' : 'ChevronDown'} />
          </button>
        )}
        {title && <span className={styles.title}>{title}</span>}
        {statusText && <span className={styles.status}>{statusText}</span>}
      </div>
      {actions ? (
        <div>{actions}</div>
      ) : showCommandBar && commandBarItems.length > 0 ? (
        <CommandBar
          items={commandBarItems.slice(0, 2)}
          overflowItems={commandBarItems.slice(2)}
          styles={{ root: { background: 'transparent', padding: 0, height: 'auto' } }}
        />
      ) : null}
    </div>
  );
};

export default SectionHeader;
