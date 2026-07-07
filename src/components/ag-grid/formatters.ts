import type { ValueFormatterParams } from 'ag-grid-community';

export type NumericInput = number | string | null | undefined;

/**
 * Coerce grid cell values to a finite number when possible.
 *
 * Handles numeric strings (including locale-formatted input) so formatters and
 * cell class rules behave consistently regardless of upstream data shape.
 */
export function coerceNumericValue(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    // Romanian locale: thousands with dot, decimals with comma.
    if (trimmed.includes(',')) {
      const normalized = trimmed.replace(/\./g, '').replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Generic number formatter (no currency), locale-aware.
 *
 * Uses a thousands separator and a fixed number of decimals. Negative values
 * are rendered with a leading minus sign (never parentheses). Intended as a
 * reusable building block for any AG Grid numeric column.
 *
 * @param value - The numeric value (null/undefined/NaN render as an empty string).
 * @param options - Locale and decimal configuration.
 * @returns The formatted string, e.g. `33.570.735,49` or `-440.756,01` for `ro-RO`.
 */
export function formatNumber(
  value: NumericInput,
  options: { locale?: string; minimumFractionDigits?: number; maximumFractionDigits?: number } = {},
): string {
  const numeric = coerceNumericValue(value);
  if (numeric == null) return '';
  const { locale = 'ro-RO', minimumFractionDigits = 2, maximumFractionDigits = 2 } = options;
  return new Intl.NumberFormat(locale, { minimumFractionDigits, maximumFractionDigits }).format(numeric);
}

/**
 * Factory for an AG Grid numeric `valueFormatter` (no currency symbol).
 *
 * @param options - Locale and decimal configuration forwarded to {@link formatNumber}.
 * @returns A `valueFormatter` usable directly on a column definition.
 */
export function createNumberValueFormatter(options?: Parameters<typeof formatNumber>[1]) {
  return (params: ValueFormatterParams): string => formatNumber(params.value as NumericInput, options);
}
