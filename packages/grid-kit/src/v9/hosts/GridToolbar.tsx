/**
 * A lean Fluent UI v9 grid toolbar — a `SearchBox` + a `<Toolbar>` of command
 * buttons. Presentational: `onSearch` bubbles the term (the grid does not filter
 * internally in this increment); commands are the v9-native `V9GridCommand[]`.
 */
import React from 'react';
import { Toolbar, ToolbarButton, SearchBox, type SearchBoxChangeEvent, type InputOnChangeData, useRestoreFocusTarget } from '@fluentui/react-components';
import type { V9GridToolbarConfig } from '../types';
import { gateCommands, dynamicsOnlyFieldsUsed } from '../../core/toolbarCommands';
import { DynamicsGridToolbar } from './toolbarOverflow';

/**
 * Grid toolbar (v9): a search box + a toolbar of commands, or with `layout: 'dynamics'`
 * the model-driven subgrid look — title left, commands right-aligned, overflow into a
 * `⋮` menu (see `DynamicsGridToolbar`).
 */
export const GridToolbar: React.FC<{ config: V9GridToolbarConfig; look?: 'default' | 'ce' }> = ({ config, look }) => {
  warnDynamicsOnlyFields(config);
  return config.layout === 'dynamics' ? (
    <DynamicsGridToolbar config={config} look={look} />
  ) : (
    <DefaultGridToolbar config={config} />
  );
};

let warnedDynamicsOnly = false;
function warnDynamicsOnlyFields(config: V9GridToolbarConfig): void {
  if (warnedDynamicsOnly || typeof console === 'undefined') return;
  const used = dynamicsOnlyFieldsUsed(config);
  if (!used.length) return;
  warnedDynamicsOnly = true;
  console.warn(
    `[grid-kit/v9] GridToolbar: ${used.join(', ')} only apply with \`layout: 'dynamics'\` and are ignored by the default layout.`
  );
}

// The restore-target hook only for a command that asked for it (`restoreFocusTarget`) — an ordinary
// toolbar must not wire tabster's restorer at all.
const RestoreTargetToolbarButton: React.FC<React.ComponentProps<typeof ToolbarButton>> = (props) => (
  <ToolbarButton {...props} {...useRestoreFocusTarget()} />
);

const DefaultGridToolbar: React.FC<{ config: V9GridToolbarConfig }> = ({ config }) => {
  const { showSearch, searchPlaceholder, onSearch } = config;
  const commands = gateCommands(config.commands ?? [], config.selectedCount, config.selectionGating);
  const hasCommands = commands.length > 0;
  if (!showSearch && !hasCommands) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, flexWrap: 'wrap' }}>
      {showSearch && (
        <SearchBox
          placeholder={searchPlaceholder ?? 'Search'}
          onChange={(_e: SearchBoxChangeEvent, data: InputOnChangeData) => onSearch?.(data.value)}
        />
      )}
      {hasCommands && (
        <Toolbar size="small" aria-label="Grid actions">
          {commands.map((c) => {
            const Button = c.restoreFocusTarget ? RestoreTargetToolbarButton : ToolbarButton;
            return (
            <Button
              key={c.key}
              icon={c.icon}
              appearance={c.appearance === 'primary' ? 'primary' : undefined}
              disabled={c.disabled}
              onClick={c.onClick}
            >
              {c.text}
            </Button>
            );
          })}
        </Toolbar>
      )}
    </div>
  );
};
