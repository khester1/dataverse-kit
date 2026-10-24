import { describe, it, expect } from 'vitest';
import React from 'react';
import { createCellRegistry } from '../registry';
import { toDetailsListColumns } from '../adapters';
import { CalloutCell } from '../adapters/CalloutCell';
import type { ColumnDef } from '../types';

describe('toDetailsListColumns — calloutContent hover-preview wiring', () => {
  const registry = createCellRegistry();
  const ctx = { registry, getKey: (x: Record<string, unknown>) => String(x.key) };

  it('wraps the cell in CalloutCell when calloutContent is set (lazy + threads dismiss opts)', () => {
    let invoked = 0;
    const col: ColumnDef = {
      key: 'owner',
      fieldName: 'owner',
      name: 'Owner',
      rendererType: 'lookup',
      calloutContent: () => {
        invoked++;
        return 'preview';
      },
      dismissMode: 'timeout',
      timeoutDuration: 150,
    };
    const [dl] = toDetailsListColumns([col], ctx);
    const el = dl.onRender!({ key: 'r1', owner: 'Alex' }) as React.ReactElement;

    expect(React.isValidElement(el)).toBe(true);
    expect(el.type).toBe(CalloutCell);
    const props = el.props as { renderContent: () => unknown; dismissMode?: string; timeoutDuration?: number };
    // Lazy: calloutContent is NOT invoked during onRender — only when the callout opens.
    expect(invoked).toBe(0);
    expect(props.renderContent()).toBe('preview');
    expect(invoked).toBe(1);
    expect(props.dismissMode).toBe('timeout');
    expect(props.timeoutDuration).toBe(150);
  });

  it('does NOT wrap when calloutContent is absent', () => {
    const col: ColumnDef = { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' };
    const [dl] = toDetailsListColumns([col], ctx);
    const el = dl.onRender!({ key: 'r1', name: 'Acme' }) as React.ReactElement;
    expect(React.isValidElement(el)).toBe(true);
    expect(el.type).not.toBe(CalloutCell);
  });
});
