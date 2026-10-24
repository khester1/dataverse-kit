import * as React from 'react';
import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { CardSurface } from '../internal';

export interface ActionCardProps {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactElement;
  /** Renders an emphasised edge while a decision is outstanding. */
  pending?: boolean;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

const useStyles = makeStyles({
  head: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS },
  description: { color: tokens.colorNeutralForeground2, fontSize: tokens.fontSizeBase200 },
  footer: { display: 'flex', gap: tokens.spacingHorizontalS, justifyContent: 'flex-end', marginTop: tokens.spacingVerticalXS },
});

/** The container the action family shares. ★ Built on the in-tree `CardSurface`, never Fluent's
 *  `Card` — see internal/CardSurface.tsx for why that one unmounts the tree on a form. */
export function ActionCard({ title, description, icon, pending, children, footer }: ActionCardProps): React.ReactElement {
  const styles = useStyles();
  return (
    <CardSurface emphasis={pending ? 'attention' : 'none'}>
      <div className={styles.head}>
        {icon ? React.cloneElement(icon, { 'aria-hidden': 'true' } as Record<string, unknown>) : null}
        <Text weight="semibold">{title}</Text>
      </div>
      {description ? <span className={styles.description}>{description}</span> : null}
      {children}
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </CardSurface>
  );
}
