// Pure-TS column helpers shared by layouts/containers and the responsive builders.
export type ColumnCount = 1 | 2 | 3 | 4;

/** CSS grid-template-columns for an N-column layout. Matches codegen `repeat(N, 1fr)`. */
export function gridTemplateForColumns(columns: ColumnCount): string {
  return `repeat(${columns}, 1fr)`;
}

/** Clamp a cell column-span to the available column count (min 1). */
export function clampSpan(span: number, columns: ColumnCount): number {
  if (!Number.isFinite(span)) return 1;
  return Math.max(1, Math.min(Math.round(span), columns));
}
