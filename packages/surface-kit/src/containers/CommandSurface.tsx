import React from 'react';
import { CommandBar } from '@fluentui/react';
import type { CommandSurfaceProps } from '../types';

/** A Dynamics-style command bar (thin wrapper over Fluent CommandBar, no card chrome). */
export const CommandSurface: React.FC<CommandSurfaceProps> = ({ items, overflowItems, farItems, className }) => (
  <div className={className}>
    <CommandBar items={items} overflowItems={overflowItems} farItems={farItems} styles={{ root: { padding: 0 } }} />
  </div>
);

export default CommandSurface;
