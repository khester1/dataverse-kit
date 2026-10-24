import * as React from 'react';
import { makeStyles, tokens, Text } from '@fluentui/react-components';
import { SuggestedPrompts } from './SuggestedPrompts';

export interface EmptyConversationProps {
  title?: string;
  description?: string;
  prompts?: readonly string[];
  onPick?: (prompt: string) => void;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingVerticalS,
    height: '100%',
    padding: tokens.spacingVerticalXXL,
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

export function EmptyConversation({
  title = 'Ask the agent',
  description = 'It answers from the records you have open.',
  prompts = [],
  onPick,
}: EmptyConversationProps): React.ReactElement {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <Text as="h2" size={500} weight="semibold">
        {title}
      </Text>
      <Text>{description}</Text>
      {onPick && prompts.length > 0 ? (
        <SuggestedPrompts prompts={prompts} onPick={onPick} heading="Try one of these" align="center" />
      ) : null}
    </div>
  );
}
