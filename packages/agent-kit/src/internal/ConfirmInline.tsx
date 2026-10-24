import * as React from 'react';
import { Button, makeStyles, tokens, Text } from '@fluentui/react-components';
import { CardSurface } from './CardSurface';

export interface ConfirmInlineProps {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const useStyles = makeStyles({
  root: { maxWidth: '420px' },
  actions: { display: 'flex', gap: tokens.spacingHorizontalS, justifyContent: 'flex-end', marginTop: tokens.spacingVerticalS },
});

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * An in-tree confirmation, replacing Fluent's `Dialog`.
 *
 * ★ `react-dialog` reaches `useModalAttributes` → `getModalizer` + `getRestorer` →
 *   `core.attrHandlers.set`. The gallery's `image-gallery-field` removed `Dialog` for exactly
 *   this and cut its bundle 431,706 → 317,346 bytes, so the trade is well established.
 *
 * ★★ BUT THAT PRECEDENT SHIPS THREE FOCUS DEFECTS, AND THIS FIXES THEM. Read against it:
 *    it focuses into the dialog and handles Escape, but it (1) never returns focus to the
 *    trigger on close, (2) has no focus trap, so Tab walks straight out of a `role="alertdialog"`,
 *    and (3) omits `aria-modal` — so the role asserts a modality the implementation does not
 *    provide, which is an ARIA lie rather than a missing nicety. Removing tabster means
 *    removing its Modalizer and Restorer, and whatever they were doing has to be done here.
 */
export function ConfirmInline(props: ConfirmInlineProps): React.ReactElement | null {
  const { open, title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive, onConfirm, onCancel } = props;
  const styles = useStyles();
  const ref = React.useRef<HTMLDivElement>(null);
  const returnTo = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const bodyId = React.useId();

  // (1) Remember where focus came from, and put it back. Without this the keyboard user is
  //     returned to <body> — the top of the page — every time they cancel.
  React.useEffect(() => {
    if (!open) return;
    returnTo.current = (document.activeElement as HTMLElement | null) ?? null;
    const first = ref.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    return () => {
      const target = returnTo.current;
      if (target && target.isConnected) target.focus();
    };
  }, [open]);

  if (!open) return null;

  // (2) The trap. A `role="alertdialog"` that Tab can leave is announcing something untrue.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <CardSurface
      ref={ref}
      role="alertdialog"
      // (3) The role without this is a claim the implementation does not honour.
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onKeyDown={onKeyDown}
      className={styles.root}
      emphasis="attention"
    >
      <Text id={titleId} weight="semibold">
        {title}
      </Text>
      <Text id={bodyId} size={200}>
        {body}
      </Text>
      <div className={styles.actions}>
        <Button size="small" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button size="small" appearance={destructive ? 'primary' : 'primary'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </CardSurface>
  );
}
