import * as React from 'react';
import { Badge } from '@fluentui/react-components';

export interface ModelBadgeProps {
  provider?: string;
  model?: string;
  version?: string;
}

/** Which agent, which model, which version — so a run can be traced to a configuration. */
export function ModelBadge({ provider, model, version }: ModelBadgeProps): React.ReactElement | null {
  const parts = [provider, model, version ? `v${version}` : undefined].filter(Boolean);
  if (parts.length === 0) return null;
  return (
    <Badge appearance="outline" color="informative">
      {parts.join(' · ')}
    </Badge>
  );
}
