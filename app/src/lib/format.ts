const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('id-ID', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Format as IDR currency: Rp 1.234.567 */
export function formatIDR(value: number): string {
  return idrFormatter.format(value);
}

/** Format number with thousand separators: 1.234 */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Format as percentage: 12,3% */
export function formatPercent(value: number): string {
  return percentFormatter.format(value / 100);
}

/** Abbreviate large numbers: 1.2M, 854K, etc. */
export function abbreviateNumber(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

/** Abbreviate IDR: Rp 854,7jt, Rp 1,2M */
export function abbreviateIDR(value: number): string {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${value}`;
}

/** Format ECharts tooltip IDR value */
export function tooltipIDR(value: number): string {
  return formatIDR(value);
}
