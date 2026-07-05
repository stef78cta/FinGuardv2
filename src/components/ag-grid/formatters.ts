import type { ValueFormatterParams } from 'ag-grid-community';

/**
 * Generic number formatter (no currency), locale-aware.
 *
 * Uses a thousands separator and a fixed number of decimals. Intended as a
 * reusable building block for any AG Grid numeric column.
 *
 * @param value - The numeric value (null/undefined/NaN render as an empty string).
 * @param options - Locale and decimal configuration.
 * @returns The formatted string, e.g. `33.570.735,49` for `ro-RO`.
 */
export function formatNumber(
  value: number | null | undefined,
  options: { locale?: string; minimumFractionDigits?: number; maximumFractionDigits?: number } = {},
): string {
  if (value == null || Number.isNaN(value)) return '';
  const { locale = 'ro-RO', minimumFractionDigits = 2, maximumFractionDigits = 2 } = options;
  return new Intl.NumberFormat(locale, { minimumFractionDigits, maximumFractionDigits }).format(value);
}

/**
 * Factory for an AG Grid numeric `valueFormatter` (no currency symbol).
 *
 * @param options - Locale and decimal configuration forwarded to {@link formatNumber}.
 * @returns A `valueFormatter` usable directly on a column definition.
 */
export function createNumberValueFormatter(options?: Parameters<typeof formatNumber>[1]) {
  return (params: ValueFormatterParams): string => formatNumber(params.value as number, options);
}
