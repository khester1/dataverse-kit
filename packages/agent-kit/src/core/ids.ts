/**
 * Build a per-instance id-prefix generator.
 *
 * ★ The FACTORY is exported (pure, testable); the module SINGLETON that a provider uses
 *   lives in src/host/idPrefix.ts. That split matters: the gallery's measurement is that
 *   there must be exactly ONE counter per bundle, so two instances of the same control get
 *   different prefixes. A constant prefix is the wrong fix and a per-call factory is too.
 */
export function createIdPrefixCounter(tag: string): () => string {
  let n = 0;
  return () => `${tag}${++n}-`;
}
