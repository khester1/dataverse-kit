/**
 * General-purpose helper utilities.
 */

/**
 * Parse query string parameters.
 */
export function parseQueryString(search: string = typeof window !== 'undefined' ? window.location.search : ''): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * Deep clone an object using JSON serialization.
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce a function call.
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Check if running in Dynamics 365 environment.
 */
export function isDynamicsEnvironment(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    ((window as any).Xrm || (window.parent as any)?.Xrm)
  );
}

/**
 * Check if running on localhost.
 */
export function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}
