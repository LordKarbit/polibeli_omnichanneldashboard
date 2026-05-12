// Dashboard color palette for charts and visual elements

export const chartColors = {
  primary: [
    '#6366f1', // indigo
    '#06b6d4', // cyan
    '#a855f7', // purple
    '#f59e0b', // amber
    '#ef4444', // red
    '#10b981', // emerald
    '#ec4899', // pink
    '#3b82f6', // blue
    '#84cc16', // lime
    '#f97316', // orange
  ],
  channels: {
    gt: '#06b6d4',       // cyan
    mt: '#a855f7',       // purple
    shopee: '#f97316',   // orange — Shopee brand
    tiktok1: '#ef4444',  // red — TikTok vibes
    tiktok2: '#ec4899',  // pink
  },
  status: {
    completed: '#10b981',
    shipped: '#3b82f6',
    pending: '#f59e0b',
    cancelled: '#ef4444',
    refunded: '#a855f7',
  },
  gradient: {
    primary: 'linear-gradient(135deg, #6366f1, #06b6d4)',
    success: 'linear-gradient(135deg, #10b981, #06b6d4)',
    danger: 'linear-gradient(135deg, #ef4444, #f97316)',
    purple: 'linear-gradient(135deg, #a855f7, #ec4899)',
    warm: 'linear-gradient(135deg, #f59e0b, #f97316)',
  },
} as const;

export const channelNames: Record<string, string> = {
  gt: 'General Trade',
  mt: 'Modern Trade',
  shopee: 'Shopee',
  tiktok1: 'TikTok Shop (Kayou ID)',
  tiktok2: 'TikTok Shop (Kayou Card ID)',
};
