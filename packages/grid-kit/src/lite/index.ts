/**
 * `@dataverse-kit/grid-kit/lite` — the semantic-table host.
 *
 * ★★★ A SEPARATE ENTRY POINT ON PURPOSE. `package.json` declares no `sideEffects`, so bundlers
 * assume there are some and tree-shaking across the `/v9` barrel is unreliable — MEASURED in
 * `card-grid`: importing `createV9CellRegistry` rather than the individual cells cost **+241 KB
 * (+83%)**. A consumer that wants a plain table should not have to out-argue the bundler about
 * whether `react-table` is reachable; `/lite` cannot reach it at all.
 */
export { LiteTable } from './LiteTable';
export type {
  LiteColumn,
  LiteRow,
  LiteCellContext,
  LiteTableClasses,
  LiteTableProps,
} from './types';
