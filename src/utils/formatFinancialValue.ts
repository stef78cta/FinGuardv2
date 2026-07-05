/**
 * Formatare valori financiare pentru tree table — minus explicit, zero ca 0,00 RON.
 */

export interface FormatFinancialValueOptions {
  /** Afișează simbolul monedei (implicit true). */
  showCurrency?: boolean;
  currency?: string;
}

export function formatFinancialValue(
  value: number,
  options: FormatFinancialValueOptions = {},
): string {
  const { showCurrency = true, currency = 'RON' } = options;
  const formatted = new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  const suffix = showCurrency ? ` ${currency}` : '';
  if (value < 0) return `-${formatted}${suffix}`;
  return `${formatted}${suffix}`;
}

export function formatFinancialDelta(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (value === 0) return formatFinancialValue(0, { showCurrency: false });
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatFinancialValue(value, { showCurrency: false })}`;
}

export function formatFinancialDeltaPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (value === 0) return '0,00%';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

export function computeDelta(current: number, previous: number | null | undefined): number | null {
  if (previous == null) return null;
  return current - previous;
}

export function computeDeltaPct(current: number, previous: number | null | undefined): number | null {
  if (previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
