import type { KPIData, ChannelContribution, DailyGMV } from './types';

export const executiveKPIs: KPIData[] = [
  {
    label: 'Total Booked GMV',
    value: 854_698_594,
    formattedValue: 'Rp 854,7jt',
    change: 12.3,
    changeLabel: 'vs prev month',
    icon: 'TrendingUp',
    format: 'currency',
  },
  {
    label: 'Active GMV',
    value: 671_192_934,
    formattedValue: 'Rp 671,2jt',
    change: 8.7,
    changeLabel: 'vs prev month',
    icon: 'DollarSign',
    format: 'currency',
  },
  {
    label: 'Total Orders',
    value: 2748,
    formattedValue: '2.748',
    change: 15.2,
    changeLabel: 'vs prev month',
    icon: 'ShoppingCart',
    format: 'number',
  },
  {
    label: 'Avg Order Value',
    value: 311_024,
    formattedValue: 'Rp 311rb',
    change: -2.1,
    changeLabel: 'vs prev month',
    icon: 'BarChart3',
    format: 'currency',
  },
  {
    label: 'Cancellation Rate',
    value: 25.1,
    formattedValue: '25,1%',
    change: 3.4,
    changeLabel: 'vs prev month',
    icon: 'XCircle',
    format: 'percent',
  },
  {
    label: 'Total Refund',
    value: 124_054_415,
    formattedValue: 'Rp 124,1jt',
    change: 5.8,
    changeLabel: 'vs prev month',
    icon: 'RotateCcw',
    format: 'currency',
  },
];

export const channelContributions: ChannelContribution[] = [
  { channel: 'General Trade', channelKey: 'gt', orders: 91, bookedGMV: 107_203_300, activeGMV: 104_753_000, aov: 1_178_058, percentage: 12.5 },
  { channel: 'Modern Trade', channelKey: 'mt', orders: 12, bookedGMV: 413_818_000, activeGMV: 363_898_000, aov: 34_484_833, percentage: 48.4 },
  { channel: 'TikTok Shop (Kayou ID)', channelKey: 'tiktok1', orders: 1512, bookedGMV: 196_755_985, activeGMV: 89_726_902, aov: 130_130, percentage: 23.0 },
  { channel: 'TikTok Shop (Kayou Card ID)', channelKey: 'tiktok2', orders: 121, bookedGMV: 33_867_856, activeGMV: 9_761_579, aov: 279_900, percentage: 4.0 },
  { channel: 'Shopee', channelKey: 'shopee', orders: 1012, bookedGMV: 103_053_453, activeGMV: 103_053_453, aov: 101_831, percentage: 12.1 },
];

// Generate 30 days of daily GMV data for April 2026
export const dailyGMV: DailyGMV[] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const date = `2026-04-${String(day).padStart(2, '0')}`;
  const weekday = new Date(2026, 3, day).getDay();
  const isWeekend = weekday === 0 || weekday === 6;
  const baseMult = isWeekend ? 0.7 : 1.0;
  const jitter = () => 0.7 + Math.random() * 0.6;

  return {
    date,
    gt: Math.round(3_500_000 * baseMult * jitter()),
    mt: day === 5 || day === 15 || day === 22 ? Math.round(80_000_000 * jitter()) : Math.round(5_000_000 * baseMult * jitter()),
    shopee: Math.round(3_400_000 * baseMult * jitter()),
    tiktok1: Math.round(6_500_000 * baseMult * jitter()),
    tiktok2: Math.round(1_100_000 * baseMult * jitter()),
    total: 0,
  };
}).map(d => ({ ...d, total: d.gt + d.mt + d.shopee + d.tiktok1 + d.tiktok2 }));
