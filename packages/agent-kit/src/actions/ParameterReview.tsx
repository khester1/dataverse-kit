import * as React from 'react';
import { Input, makeStyles, tokens, Text } from '@fluentui/react-components';

export interface ParameterReviewProps {
  /** RAW arguments as the model emitted them. */
  argumentsJson: string;
  readOnly?: boolean;
  onChange?: (next: string) => void;
}

const useStyles = makeStyles({
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(110px, max-content) 1fr',
    gap: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    alignItems: 'center',
    margin: 0,
  },
  key: { margin: 0, color: tokens.colorNeutralForeground2, fontSize: tokens.fontSizeBase200 },
  value: { margin: 0 },
  raw: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
});

/**
 * The arguments a tool call is proposing, laid out for a human to check before approving.
 *
 * ★ A definition list on a CSS grid, NOT a `Table`/`DataGrid` — both reach
 *   `useArrowNavigationGroup`, and this is key/value data rather than a grid.
 *
 * ★★ It falls back to showing the RAW string when the JSON does not parse, and that matters:
 *    a half-streamed arguments blob is not valid JSON, and an approval UI that silently
 *    rendered nothing would ask the user to approve something they cannot see. Showing the raw
 *    text is honest; showing an empty table is not.
 */
export function ParameterReview({ argumentsJson, readOnly = true, onChange }: ParameterReviewProps): React.ReactElement {
  const styles = useStyles();

  const parsed = React.useMemo<Record<string, unknown> | null>(() => {
    try {
      const value: unknown = JSON.parse(argumentsJson);
      return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }, [argumentsJson]);

  if (!parsed) {
    return (
      <div>
        <Text size={200}>Arguments (unparsed)</Text>
        <pre className={styles.raw}>{argumentsJson || '(empty)'}</pre>
      </div>
    );
  }

  const set = (key: string, next: string) => {
    if (!onChange) return;
    onChange(JSON.stringify({ ...parsed, [key]: next }));
  };

  return (
    <dl className={styles.grid}>
      {Object.entries(parsed).map(([key, value]) => (
        <React.Fragment key={key}>
          <dt className={styles.key}>{key}</dt>
          <dd className={styles.value}>
            {readOnly ? (
              <span className={styles.raw}>{typeof value === 'string' ? value : JSON.stringify(value)}</span>
            ) : (
              <Input
                size="small"
                aria-label={key}
                value={typeof value === 'string' ? value : JSON.stringify(value)}
                onChange={(_, data) => set(key, data.value)}
              />
            )}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
