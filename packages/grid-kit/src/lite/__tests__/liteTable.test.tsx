// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LiteTable } from '../LiteTable';
import type { LiteColumn, LiteRow } from '../types';

afterEach(cleanup);

const columns: LiteColumn[] = [
  { name: 'name', displayName: 'Name', isPrimary: true },
  { name: 'city', displayName: 'City' },
];
const rows: LiteRow[] = [
  { id: 'r1', cells: { name: 'Contoso', city: 'Boston' } },
  { id: 'r2', cells: { name: 'Fabrikam', city: 'Atlanta' } },
];

describe('LiteTable — structure', () => {
  it('renders a semantic table with one header per column and one row per record', () => {
    render(<LiteTable columns={columns} rows={rows} />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name', 'City']);
    // +1 for the header row
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1);
    expect(screen.getByText('Boston')).toBeTruthy();
  });

  it('renders a missing cell value as empty rather than "undefined"', () => {
    render(<LiteTable columns={columns} rows={[{ id: 'r3', cells: { name: 'Solo' } }]} />);
    const cells = screen.getAllByRole('cell');
    expect(cells[1].textContent).toBe('');
  });
});

describe('LiteTable — the primary-column open affordance', () => {
  it('renders the primary column as a button that reports the row id', () => {
    const onOpen = vi.fn();
    render(<LiteTable columns={columns} rows={rows} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fabrikam' }));
    expect(onOpen).toHaveBeenCalledWith('r2');
  });

  /**
   * ★★ WITHOUT `onOpen` THE SAME COLUMN MUST BE PLAIN TEXT. A control with no open affordance
   * should not render a dead link — and this is the pair where the two outcomes must differ, so
   * the test above cannot pass by the cell always being a button.
   */
  it('renders the primary column as text when no onOpen is supplied', () => {
    render(<LiteTable columns={columns} rows={rows} />);
    expect(screen.queryByRole('button', { name: 'Fabrikam' })).toBeNull();
    expect(screen.getByText('Fabrikam')).toBeTruthy();
  });
});

describe('LiteTable — duplicate column names', () => {
  /**
   * ★★★★ THE FIX THIS HOST PROPAGATES. `choice-grid` keys cells `name#index` because a view can
   * carry the same column twice (once plain, once via a property-set); keying by name alone gave
   * React two children with one key and BOTH cells reacted to one interaction. MEASURED
   * 2026-09-23: `ordering-grid` and `inline-create-grid` still key by `c.name` alone.
   * React reports a duplicate key on console.error, so that is the oracle.
   */
  const dupes: LiteColumn[] = [
    { name: 'city', displayName: 'City' },
    { name: 'city', displayName: 'City (again)' },
  ];

  it('renders both copies with no duplicate-key warning', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<LiteTable columns={dupes} rows={rows} />);
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
    // 2 columns x 2 rows
    expect(screen.getAllByRole('cell')).toHaveLength(4);
    const dupWarnings = spy.mock.calls.filter((c) => String(c[0]).includes('same key'));
    expect(dupWarnings).toEqual([]);
    spy.mockRestore();
  });

  it('gives each copy an independent cell, so one interaction hits one cell', () => {
    const clicked: string[] = [];
    render(
      <LiteTable
        columns={dupes}
        rows={[rows[0]]}
        renderCell={({ column, index, text }) => (
          <button type="button" onClick={() => clicked.push(`${column.name}#${index}`)}>{text}</button>
        )}
      />,
    );
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(clicked).toEqual(['city#1']);
  });
});

describe('LiteTable — the slots each control needs', () => {
  it('renderCell replaces the cell body and receives resolved text', () => {
    render(
      <LiteTable columns={columns} rows={[rows[0]]}
        renderCell={({ text, column }) => <span data-testid={column.name}>[{text}]</span>} />,
    );
    expect(screen.getByTestId('city').textContent).toBe('[Boston]');
  });

  it('leading adds one header cell and one body cell per row (ordering-grid drag handle)', () => {
    render(
      <LiteTable columns={columns} rows={rows}
        leading={{ header: <span>H</span>, cell: (row, i) => <span>{`${row.id}:${i}`}</span> }} />,
    );
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByText('r2:1')).toBeTruthy();
  });

  it('footerRow is appended inside tbody (inline-create-grid draft row)', () => {
    render(
      <LiteTable columns={columns} rows={rows}
        footerRow={<tr data-testid="draft"><td colSpan={2}>new…</td></tr>} />,
    );
    const draft = screen.getByTestId('draft');
    expect(draft.parentElement?.tagName).toBe('TBODY');
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 2);
  });

  /**
   * ★★★ THE FIXTURE MUST MAKE THE TWO CELLS DIFFER, or a uniform `classes.td` passes it. This is
   * the whole reason the hook exists: `choice-grid`'s editable cells need `overflow: visible` so
   * the badge's focus ring is not clipped, while its text cells need `overflow: hidden` to
   * ellipsise — two opposite requirements in one table. A test where every cell wants the same
   * class could not tell this implementation from the one that shipped before it.
   * ★★ AND ONE COLUMN RETURNS `undefined` IN THE SAME RENDER, so the fallback and the override are
   * measured together. Testing the fallback alone is vacuous — a `cellClassName` that is never
   * read at all produces exactly the same DOM.
   */
  it('cellClassName sets each body cell independently and falls back to classes.td', () => {
    render(
      <LiteTable
        columns={columns}
        rows={[rows[0]]}
        classes={{ td: 'cell' }}
        cellClassName={({ column }) => (column.name === 'city' ? 'cell editing' : undefined)}
      />,
    );
    expect(screen.getAllByRole('cell').map((c) => c.getAttribute('class'))).toEqual(['cell', 'cell editing']);
  });

  it('cellClassName receives the same context as renderCell, position included', () => {
    const seen: string[] = [];
    render(
      <LiteTable
        columns={columns}
        rows={[rows[0]]}
        cellClassName={({ row, column, index, text }) => {
          seen.push(`${row.id}/${column.name}#${index}=${text}`);
          return undefined;
        }}
      />,
    );
    expect(seen).toEqual(['r1/name#0=Contoso', 'r1/city#1=Boston']);
  });

  /**
   * ★★ The header and the leading cell have their own class paths (`classes.th`,
   * `leading.cellClassName`). A naive implementation that mapped the hook over every `<td>` and
   * `<th>` would restyle a drag handle with a data cell's class.
   */
  it('cellClassName reaches neither the header nor the leading cell', () => {
    render(
      <LiteTable
        columns={columns}
        rows={[rows[0]]}
        classes={{ th: 'head', td: 'cell' }}
        leading={{ header: <span>H</span>, cell: () => <span>h</span>, cellClassName: 'handle' }}
        cellClassName={() => 'body-only'}
      />,
    );
    expect(screen.getAllByRole('columnheader').map((h) => h.getAttribute('class'))).toEqual(['head', 'head', 'head']);
    expect(screen.getAllByRole('cell').map((c) => c.getAttribute('class'))).toEqual(['handle', 'body-only', 'body-only']);
  });

  it('rowProps are spread onto the body row (drag handlers)', () => {
    const onDragStart = vi.fn();
    render(<LiteTable columns={columns} rows={rows} rowProps={() => ({ draggable: true, onDragStart })} />);
    const firstBodyRow = screen.getAllByRole('row')[1];
    expect(firstBodyRow.getAttribute('draggable')).toBe('true');
    fireEvent.dragStart(firstBodyRow);
    expect(onDragStart).toHaveBeenCalled();
  });
});

describe('LiteTable — the imports contract', () => {
  /**
   * ★★★★ THE WHOLE REASON THE `/lite` ENTRY EXISTS. If this file ever imports the Fluent DataGrid
   * (or anything else that drags `react-table` / a focus manager), consumers inherit the tabster
   * singleton hazard that three gallery controls hand-rolled a table to avoid — and they would
   * inherit it silently, because it only shows on a real form. A source assertion is crude but it
   * fails at the moment the import is added rather than six versions later.
   */
  it('LiteTable.tsx imports no DataGrid, react-table or focus-manager surface', () => {
    const src = readFileSync(join(__dirname, '..', 'LiteTable.tsx'), 'utf8');
    const imports = src.split('\n').filter((l) => /^\s*import\b/.test(l)).join('\n');
    for (const banned of ['DataGrid', 'react-table', 'useArrowNavigationGroup', 'Tooltip', 'Menu', 'useFocus']) {
      expect(imports.includes(banned), `LiteTable must not import ${banned}`).toBe(false);
    }
    expect(imports).toContain("from '@fluentui/react-components'"); // Link only
  });
});
