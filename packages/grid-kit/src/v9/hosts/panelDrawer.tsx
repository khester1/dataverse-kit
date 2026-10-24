/**
 * The drawer shell shared by the v9 side panels (column chooser, filter builder): an end-side
 * `OverlayDrawer` with a titled header + close button, a scrolling body, and a footer row. One
 * module, so a grid that adopts BOTH panels carries the drawer once.
 *
 * ★ No `DrawerFooter`: grid-kit's peer floor is `@fluentui/react-components ^9.46.2`, and a primitive
 *   absent there would fail at runtime in a consumer on the floor. The footer is a plain flex row.
 */
import React from 'react';
import { Button, DrawerBody, DrawerHeader, DrawerHeaderTitle, OverlayDrawer, makeStyles, tokens } from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalXXL}`,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
});

export interface PanelDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Rendered in the footer row (right-aligned) — typically Cancel + Apply. */
  footer: React.ReactNode;
  children: React.ReactNode;
}

export function PanelDrawer({ open, onClose, title, footer, children }: PanelDrawerProps): JSX.Element {
  const styles = useStyles();
  return (
    <OverlayDrawer open={open} position="end" size="medium" onOpenChange={(_e, d) => !d.open && onClose()}>
      <DrawerHeader>
        <DrawerHeaderTitle action={<Button appearance="subtle" aria-label="Close" icon={<DismissRegular />} onClick={onClose} />}>
          {title}
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody className={styles.body}>{children}</DrawerBody>
      <div className={styles.footer}>{footer}</div>
    </OverlayDrawer>
  );
}
