import * as React from 'react';
import { Button, makeStyles, tokens, Text } from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';

export interface RightPaneProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
  width?: number;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    minHeight: 0,
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    padding: tokens.spacingVerticalS,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  body: { flex: 1, overflowY: 'auto', padding: tokens.spacingVerticalM },
});

/**
 * The detail pane beside the conversation — sources, a record, a trace.
 *
 * ★ A plain `<aside>`, NOT Fluent's `Drawer`. `react-drawer` composes dialog internals, and an
 *   inline pane needs none of a drawer's modality: it sits in the layout rather than over it.
 */
export function RightPane({ open, title, onClose, children, width = 320 }: RightPaneProps): React.ReactElement | null {
  const styles = useStyles();
  const labelId = React.useId();
  if (!open) return null;

  return (
    <aside className={styles.root} style={{ width }} aria-labelledby={labelId}>
      <div className={styles.head}>
        <Text id={labelId} weight="semibold">
          {title}
        </Text>
        <Button
          appearance="subtle"
          size="small"
          icon={<DismissRegular />}
          onClick={onClose}
          aria-label={`Close ${title}`}
        />
      </div>
      <div className={styles.body}>{children}</div>
    </aside>
  );
}
