/**
 * Formatting utilities for Dynamics 365 data types.
 */

/**
 * Format a GUID by removing curly braces.
 */
export function cleanGuid(guid: string | null | undefined): string {
  if (!guid) return '';
  return guid.replace(/[{}]/g, '');
}

/**
 * Format currency value.
 */
export function formatCurrency(
  value: number | null | undefined,
  currency = 'USD',
  locale = 'en-US'
): string {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format number with locale-specific separators.
 */
export function formatNumber(
  value: number | null | undefined,
  locale = 'en-US'
): string {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString(locale);
}

/**
 * Format date string.
 */
export function formatDate(
  dateString: string | null | undefined,
  locale = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString(locale, options ?? {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date and time string.
 */
export function formatDateTime(
  dateString: string | null | undefined,
  locale = 'en-US'
): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get status label from statecode.
 */
export function getStatusLabel(statecode: number): string {
  switch (statecode) {
    case 0:
      return 'Active';
    case 1:
      return 'Inactive';
    default:
      return 'Unknown';
  }
}
