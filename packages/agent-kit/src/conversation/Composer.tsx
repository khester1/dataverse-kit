import * as React from 'react';
import { Button, Textarea, makeStyles, mergeClasses, tokens, Tooltip } from '@fluentui/react-components';
import { SendRegular, StopRegular } from '@fluentui/react-icons';
import { useVisuallyHiddenStyles } from '../a11y/visuallyHidden';

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (value: string) => void;
  onStop?: () => void;
  busy?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  /** 'enter' sends on Enter; 'mod+enter' needs Ctrl/Cmd. */
  sendOn?: 'enter' | 'mod+enter';
  /** Rendered inside the box, left of the send button — attachments, formatting, emoji. */
  toolbar?: React.ReactNode;
}

/** Hard-newline rows the field grows to before it starts scrolling. */
const MAX_ROWS = 6;

const useStyles = makeStyles({
  wrapper: {
    padding: tokens.spacingVerticalS,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  // The Teams send box: ONE rounded container holding the field and the affordances.
  box: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalXXS,
    paddingLeft: tokens.spacingHorizontalS,
    paddingRight: tokens.spacingHorizontalXXS,
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
    borderRadius: tokens.borderRadiusXLarge,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground1,
    // ★ The ring moves to the CONTAINER because the field's own indicator is suppressed below.
    //   It is an `outline`, not a box-shadow, so forced-colors still paints it (a11y rule 5).
    ':focus-within': {
      border: `1px solid ${tokens.colorCompoundBrandStroke}`,
      outline: `2px solid ${tokens.colorCompoundBrandStroke}`,
      outlineOffset: '-1px',
    },
  },
  boxDisabled: {
    backgroundColor: tokens.colorNeutralBackgroundDisabled,
    border: `1px solid ${tokens.colorNeutralStrokeDisabled}`,
  },
  // Fluent's Textarea has no transparent appearance, so its chrome is removed here and the
  // container above supplies it. `::after` is Fluent's focus underline.
  field: {
    flexGrow: 1,
    minWidth: 0,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 0,
    '::after': { display: 'none' },
  },
  fieldInner: {
    backgroundColor: 'transparent',
    // ★ Fluent's Textarea ships `min-height: 52px` (measured). The affordance buttons are 32px,
    //   so the default left the placeholder on one line and the icons on another — the single
    //   visible difference from the Teams reference. Matching the button height puts them on
    //   one baseline; growth past one row is then driven by `rows`, up to maxHeight.
    minHeight: '32px',
    maxHeight: '160px',
    paddingLeft: 0,
    paddingRight: 0,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    // ★ No extra bottom padding: `alignItems: flex-end` on the box already pins this row to the
    //   field's last line, and padding on top of it pushed the send glyph visibly below the
    //   baseline on a single-row box (measured against the Teams reference).
  },
  divider: {
    width: '1px',
    alignSelf: 'center',
    height: '20px',
    marginLeft: tokens.spacingHorizontalXXS,
    marginRight: tokens.spacingHorizontalXXS,
    backgroundColor: tokens.colorNeutralStroke2,
  },
});

/**
 * The send box, shaped like the Teams composer: one rounded container holding a borderless
 * field, the host's affordances, and the send button behind a divider.
 *
 * ★ `sendOn` is configurable, and defaults to Enter only because that is what users expect
 *   from Teams. Enter-to-send in a multiline field is hostile to dictation and voice control,
 *   and Shift+Enter is undiscoverable — hence the `aria-describedby` hint. The hint is
 *   VISUALLY HIDDEN, not removed: Teams does not print it, but a screen-reader user has no
 *   other way to learn the contract.
 *
 * ★ Growth is by HARD NEWLINE only, to `MAX_ROWS`, then the field scrolls. It does not grow on
 *   soft wrap — that needs measurement, and a ResizeObserver here would be untestable in jsdom
 *   (a stubbed one never fires). Stated rather than implied, because Teams does grow on wrap.
 *
 * ★ Deliberately NOT Fluent's `Toolbar` for the affordance row: it reaches
 *   `useArrowNavigationGroup`. Consumers pass plain buttons, or the in-tree ActionToolbar.
 *   The kit ships no emoji/GIF/format pickers — those are host concerns; `toolbar` is the slot.
 */
export function Composer(props: ComposerProps): React.ReactElement {
  const {
    value, onChange, onSend, onStop, busy = false, disabled = false,
    placeholder = 'Type a message', maxLength, sendOn = 'enter', toolbar,
  } = props;
  const styles = useStyles();
  const vh = useVisuallyHiddenStyles();
  const hintId = React.useId();

  const submit = () => {
    const text = value.trim();
    if (!text || busy || disabled) return;
    onSend(text);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    const wants = sendOn === 'enter' ? !event.shiftKey : event.metaKey || event.ctrlKey;
    if (!wants) return;
    event.preventDefault();
    submit();
  };

  const hint = sendOn === 'enter'
    ? 'Press Enter to send, Shift plus Enter for a new line.'
    : 'Press Control or Command plus Enter to send.';

  const rows = Math.min(MAX_ROWS, Math.max(1, value.split('\n').length));

  return (
    <div className={styles.wrapper}>
      <div className={mergeClasses(styles.box, disabled && styles.boxDisabled)}>
        <Textarea
          className={styles.field}
          value={value}
          onChange={(_, data) => onChange(data.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          resize="none"
          appearance="outline"
          aria-label={placeholder}
          aria-describedby={hintId}
          textarea={{ 'aria-multiline': true, rows, className: styles.fieldInner }}
        />
        <div className={styles.actions}>
          {toolbar}
          {toolbar ? <span className={styles.divider} aria-hidden="true" /> : null}
          {busy && onStop ? (
            <Tooltip content="Stop generating" relationship="label" withArrow>
              <Button appearance="subtle" icon={<StopRegular />} onClick={onStop} />
            </Tooltip>
          ) : (
            <Tooltip content="Send" relationship="label" withArrow>
              <Button
                appearance="subtle"
                icon={<SendRegular />}
                onClick={submit}
                disabled={!value.trim() || busy || disabled}
              />
            </Tooltip>
          )}
        </div>
      </div>
      <span id={hintId} className={vh.root}>{hint}</span>
    </div>
  );
}
