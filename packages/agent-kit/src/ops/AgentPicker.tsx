import * as React from 'react';
import { Dropdown, Option, Field } from '@fluentui/react-components';
import type { AgentDescriptor } from './types';

export interface AgentPickerProps {
  agents: readonly AgentDescriptor[];
  selectedId?: string;
  onSelect: (id: string) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Choose which agent answers.
 *
 * ★ Fluent's `Dropdown` — measured tabster-safe. `react-combobox` imports only
 *   `useTabsterAttributes`, `useMergedTabsterAttributes_unstable`, `useSetKeyboardNavigation` and
 *   `useOnKeyboardNavigationChange`; `useTabsterAttributes` calls `useTabster()` with NO argument,
 *   and `useTabster`'s default factory is the identity, so it never reaches a `get*` factory or
 *   `attrHandlers.set`. Two reviewers disagreed about this and the source settled it.
 *
 * ★ Selecting an agent is a CONFIG change, not a capability change: the seam still has no write
 *   method whichever agent is chosen.
 */
export function AgentPicker({
  agents,
  selectedId,
  onSelect,
  label = 'Agent',
  disabled,
}: AgentPickerProps): React.ReactElement {
  const selected = agents.find((a) => a.id === selectedId);

  return (
    <Field label={label}>
      <Dropdown
        disabled={disabled}
        value={selected ? selected.name : ''}
        selectedOptions={selectedId ? [selectedId] : []}
        onOptionSelect={(_, data) => {
          if (data.optionValue) onSelect(data.optionValue);
        }}
        placeholder="Select an agent"
      >
        {agents.map((agent) => (
          <Option key={agent.id} value={agent.id} text={agent.name}>
            {agent.model ? `${agent.name} — ${agent.model}` : agent.name}
          </Option>
        ))}
      </Dropdown>
    </Field>
  );
}
