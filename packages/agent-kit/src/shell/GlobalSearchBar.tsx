import * as React from 'react';
import { SearchBox, makeStyles } from '@fluentui/react-components';

export interface GlobalSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
}

const useStyles = makeStyles({
  root: { width: '100%', maxWidth: '640px' },
});

/** ★ `SearchBox` is `react-search`, which has no tabster dependency — safe. */
export function GlobalSearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search conversations',
}: GlobalSearchBarProps): React.ReactElement {
  const styles = useStyles();
  return (
    <SearchBox
      className={styles.root}
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(_, data) => onChange(data.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onSubmit) onSubmit(value);
      }}
    />
  );
}
