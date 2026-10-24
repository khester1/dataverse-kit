/**
 * `<LiteTable>` — a semantic `<table>` host with NO Fluent `DataGrid` and NO `react-table`.
 *
 * ★★★★★ WHY THIS EXISTS, AND WHY IT IS NOT A LESSER `<DataGrid>`. Three gallery controls
 * (`choice-grid`, `ordering-grid`, `inline-create-grid`) each hand-rolled this table, and each did
 * so DELIBERATELY. `choice-grid/PORT-THESIS.md` states the reason: a plain `<table>` "keeps Fluent
 * v9's `DataGrid` (`react-table`) out, which is on the `useArrowNavigationGroup` → `getMover` →
 * `attrHandlers.set` list that cost `image-gallery-field` six versions." Every gallery control that
 * does mount the DataGrid host carries a `tabsterIsolation.ts` window proxy to survive it; the three
 * that use a plain table carry none and need none.
 *
 * So this is not a downgrade path. It is the host grid-kit was missing: the three controls were not
 * deviating from grid-kit, they were routing around a trap grid-kit only offered one way through.
 *
 * ★★★★ THE EXTRACTION ALSO PROPAGATES A FIX, which is the part that makes it worth more than tidy.
 * `choice-grid` keys its cells `` `${name}#${index}` `` because `resolveColumns` deliberately does
 * not de-duplicate — a view can carry the same column twice, once plain and once through a
 * property-set — and keying by name alone gave React two children with one key, so **both copies
 * opened a listbox at once over the same record**. MEASURED in this tree 2026-09-23:
 * `ordering-grid` and `inline-create-grid` still key by `c.name` alone and carry that latent bug.
 * This host always keys by position as well as name, so adopting it fixes them.
 *
 * ★★ IMPORTS ARE THE CONTRACT. `Link` is the only Fluent component here, and it is an anchor — no
 * focus manager, no tabster. A test asserts this file never imports `@fluentui/react-components`
 * beyond that; if a future edit reaches for `DataGrid`, `Tooltip` or `Menu`, the whole reason for
 * the `lite` entry point is gone and the test should stop it.
 */
import * as React from 'react';
import { Link } from '@fluentui/react-components';
import type { LiteCellContext, LiteColumn, LiteRow, LiteTableProps } from './types';

/**
 * ★★★ POSITION-AWARE KEY, ALWAYS. See the header — a duplicated column name is a real shape here,
 * not a hypothetical, and the failure it causes (two cells reacting to one interaction) reads as a
 * control bug rather than a key bug.
 */
const cellKey = (column: LiteColumn, index: number): string => `${column.name}#${index}`;

export function LiteTable<C extends LiteColumn = LiteColumn, R extends LiteRow = LiteRow>(
  props: LiteTableProps<C, R>,
): JSX.Element {
  const { columns, rows, classes, onOpen, renderCell, cellClassName, leading, rowProps, footerRow, ariaLabel } = props;

  return (
    <table className={classes?.table} aria-label={ariaLabel}>
      <thead>
        <tr>
          {leading ? <th className={leading.headerClassName ?? classes?.th} scope="col">{leading.header}</th> : null}
          {columns.map((c, i) => (
            <th key={cellKey(c, i)} className={classes?.th} scope="col">
              {c.displayName}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => {
          const extra = rowProps?.(row, rowIndex);
          return (
            <tr key={row.id} {...extra} className={extra?.className ?? classes?.tr}>
              {leading ? (
                <td className={leading.cellClassName ?? classes?.td}>{leading.cell(row, rowIndex)}</td>
              ) : null}
              {columns.map((c, i) => {
                const text = row.cells[c.name] ?? '';
                const ctx: LiteCellContext<C, R> = { row, column: c, index: i, text };
                return (
                  /*
                   * ★★ `cellClassName` REPLACES `classes.td` rather than adding to it, and that is
                   * deliberate: one place decides the final class, so a caller can also take the
                   * uniform class AWAY from a cell. `leading.cellClassName` above reads the same
                   * way. A caller wanting both composes them (`mergeClasses(td, extra)`).
                   */
                  <td key={cellKey(c, i)} className={cellClassName?.(ctx) ?? classes?.td}>
                    {renderCell
                      ? renderCell(ctx)
                      : /*
                         * ★★ The default cell — the block that was byte-for-byte identical in
                         * `ordering-grid` and `inline-create-grid`. `onOpen` is what makes the
                         * primary column a link; without it the same column renders as text, so a
                         * control that has no open affordance does not have to fake one.
                         */
                        c.isPrimary && onOpen
                        ? <Link as="button" onClick={() => onOpen(row.id)}>{text}</Link>
                        : text}
                  </td>
                );
              })}
            </tr>
          );
        })}
        {footerRow}
      </tbody>
    </table>
  );
}
