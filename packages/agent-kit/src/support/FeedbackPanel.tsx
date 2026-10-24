import * as React from 'react';
import {
  Button, Radio, RadioGroup, Text, Textarea, makeStyles, mergeClasses, tokens,
} from '@fluentui/react-components';
import { StarRegular, StarFilled } from '@fluentui/react-icons';
import { useRovingTabindex } from '../a11y/useRovingTabindex';
import type { FeedbackValue } from './types';

export interface FeedbackPanelProps {
  value: FeedbackValue;
  onChange: (value: FeedbackValue) => void;
  onSubmit: (value: FeedbackValue) => void;
  onCancel?: () => void;
  heading?: string;
  ratingLabel?: string;
  /** Rendered under "Add more details" — a host's screenshot/attachment affordance. */
  attachments?: React.ReactNode;
  /** Shown above the buttons. The reference names the signed-in user and links its policy. */
  privacyNote?: React.ReactNode;
  busy?: boolean;
}

const STARS = [1, 2, 3, 4, 5] as const;

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, padding: tokens.spacingVerticalL, maxWidth: '680px' },
  field: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS },
  stars: { display: 'flex', gap: tokens.spacingHorizontalXS },
  star: {
    border: 'none', background: 'none', cursor: 'pointer', padding: tokens.spacingVerticalXXS,
    color: tokens.colorNeutralForeground2, fontSize: '26px', lineHeight: 1,
    ':focus-visible': { outline: `2px solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
  },
  starOn: { color: tokens.colorCompoundBrandForeground1 },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: tokens.spacingHorizontalS },
  note: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

/**
 * Structured feedback capture, as the M365 admin centre's "Submit feedback to Microsoft": a star
 * rating, free text, a host attachment slot, a REQUIRED contact-consent choice, and a privacy note.
 *
 * ★★ THE RATING IS AN APG RADIOGROUP, in-tree. Five buttons with roving tabindex and
 *    `aria-checked` is the whole pattern; reaching for a Fluent component here would buy the
 *    tabster-singleton hazard (measured: one Fluent `Menu` = +185 KB and 2 `attrHandlers.set`) for
 *    nothing. `RadioGroup` IS used for the consent pair, which is a genuine native radio group.
 *
 * ★★ SUBMIT IS DISABLED UNTIL BOTH A RATING AND A CONSENT ANSWER EXIST, and the reason is not
 *    tidiness: the reference marks consent required, and a feedback record submitted without it
 *    cannot lawfully be followed up. `mayContact === undefined` is "not answered" and is NOT the
 *    same as `false` — collapsing the two would silently record a refusal the user never gave.
 */
export function FeedbackPanel(props: FeedbackPanelProps): React.ReactElement {
  const {
    value, onChange, onSubmit, onCancel,
    heading = 'Send feedback',
    ratingLabel = 'Rate your experience',
    attachments, privacyNote, busy = false,
  } = props;
  const styles = useStyles();
  const baseId = React.useId();
  const roving = useRovingTabindex({
    itemCount: STARS.length,
    orientation: 'horizontal',
    onActivate: (i) => onChange({ ...value, rating: i + 1 }),
  });

  const canSubmit = value.rating > 0 && value.mayContact !== undefined && !busy;

  return (
    <div className={styles.root}>
      <Text as="h2" size={600} weight="semibold">{heading}</Text>

      <div className={styles.field}>
        <Text id={`${baseId}-rating`}>{ratingLabel}</Text>
        <div className={styles.stars} role="radiogroup" aria-labelledby={`${baseId}-rating`}>
          {STARS.map((n, i) => {
            const item = roving.getItemProps(i);
            const on = value.rating >= n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={value.rating === n}
                aria-label={`${n} of 5`}
                className={mergeClasses(styles.star, on && styles.starOn)}
                {...item}
                onClick={() => { roving.setActiveIndex(i); onChange({ ...value, rating: n }); }}
              >
                {on ? <StarFilled /> : <StarRegular />}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.field}>
        <Text id={`${baseId}-detail`}>Explain in more detail</Text>
        <Textarea
          aria-labelledby={`${baseId}-detail`}
          placeholder="Do not include any private or sensitive information."
          value={value.comment}
          onChange={(_, d) => onChange({ ...value, comment: d.value })}
          resize="vertical"
        />
      </div>

      {attachments ? (
        <div className={styles.field}>
          <Text>Add more details</Text>
          {attachments}
        </div>
      ) : null}

      <div className={styles.field}>
        <Text id={`${baseId}-consent`}>May we contact you about your feedback?</Text>
        <RadioGroup
          aria-labelledby={`${baseId}-consent`}
          value={value.mayContact === undefined ? '' : value.mayContact ? 'yes' : 'no'}
          onChange={(_, d) => onChange({ ...value, mayContact: d.value === 'yes' })}
        >
          <Radio value="yes" label="Yes, you may contact me" />
          <Radio value="no" label="No, don't contact me" />
        </RadioGroup>
      </div>

      {privacyNote ? <div className={styles.note}>{privacyNote}</div> : null}

      <div className={styles.footer}>
        {onCancel ? <Button appearance="secondary" onClick={onCancel}>Cancel</Button> : null}
        <Button appearance="primary" disabled={!canSubmit} onClick={() => onSubmit(value)}>Submit</Button>
      </div>
    </div>
  );
}
