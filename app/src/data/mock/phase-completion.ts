// GT Heatmap: Region × SKU data
export const gtRegionSKUHeatmap = [
  { region: 'Riky Marojahan H.', sku: 'MLBB OOL', gmv: 12_400_000 },
  { region: 'Riky Marojahan H.', sku: 'My Little Pony', gmv: 8_200_000 },
  { region: 'Riky Marojahan H.', sku: 'Scratch Card', gmv: 450_000 },
  { region: 'Riky Marojahan H.', sku: 'MLBB Display', gmv: 2_000_000 },
  { region: 'Wahyu Kusuma N.', sku: 'MLBB OOL', gmv: 9_800_000 },
  { region: 'Wahyu Kusuma N.', sku: 'My Little Pony', gmv: 5_100_000 },
  { region: 'Wahyu Kusuma N.', sku: 'Scratch Card', gmv: 320_000 },
  { region: 'Wahyu Kusuma N.', sku: 'MLBB Display', gmv: 1_800_000 },
  { region: 'Nur Setyo Aji', sku: 'MLBB OOL', gmv: 7_200_000 },
  { region: 'Nur Setyo Aji', sku: 'My Little Pony', gmv: 4_500_000 },
  { region: 'Nur Setyo Aji', sku: 'Card Album', gmv: 900_000 },
  { region: 'Pungguh Ikhsan P.', sku: 'MLBB OOL', gmv: 5_300_000 },
  { region: 'Pungguh Ikhsan P.', sku: 'My Little Pony', gmv: 3_200_000 },
  { region: 'Pungguh Ikhsan P.', sku: 'Scratch Card', gmv: 280_000 },
  { region: 'Lamsihar Sitorus', sku: 'MLBB OOL', gmv: 6_100_000 },
  { region: 'Lamsihar Sitorus', sku: 'My Little Pony', gmv: 3_800_000 },
  { region: 'Lamsihar Sitorus', sku: 'MLBB Display', gmv: 1_200_000 },
  { region: 'Muliyawarman M.', sku: 'MLBB OOL', gmv: 4_800_000 },
  { region: 'Muliyawarman M.', sku: 'My Little Pony', gmv: 2_100_000 },
  { region: 'Yoppi Dwi A.', sku: 'MLBB OOL', gmv: 3_600_000 },
  { region: 'Yoppi Dwi A.', sku: 'NARUTO', gmv: 1_080_000 },
  { region: 'Yoppi Dwi A.', sku: 'MLBB HoD', gmv: 2_100_000 },
];

// GT Pareto SKU contribution
export const gtParetoSKU = [
  { sku: 'MLBB OOL', gmv: 65_867_000, cumulativePercent: 61.4 },
  { sku: 'My Little Pony', gmv: 27_654_000, cumulativePercent: 87.2 },
  { sku: 'MLBB Display Rack', gmv: 7_000_000, cumulativePercent: 93.8 },
  { sku: 'MLBB HoD', gmv: 2_100_000, cumulativePercent: 95.7 },
  { sku: 'Card Album', gmv: 1_848_000, cumulativePercent: 97.5 },
  { sku: 'Scratch Card', gmv: 1_649_000, cumulativePercent: 99.0 },
  { sku: 'NARUTO', gmv: 1_080_000, cumulativePercent: 100 },
  { sku: 'Poster POSM', gmv: 5_300, cumulativePercent: 100 },
];

// Marketplace daily GMV by shop
export const marketplaceDailyGMV: { date: string; tiktok1: number; shopee: number; tiktok2: number }[] = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-04-${String(i + 1).padStart(2, '0')}`,
  tiktok1: Math.floor(3_000_000 + Math.random() * 8_000_000),
  shopee: Math.floor(2_000_000 + Math.random() * 5_000_000),
  tiktok2: Math.floor(500_000 + Math.random() * 2_000_000),
}));

// Marketplace refund waterfall
export const marketplaceRefundWaterfall = {
  grossGMV: 333_677_294,
  discount: 45_820_000,
  refundAmount: 124_054_415,
  activeGMV: 202_541_934,
};

// SKU × Channel matrix
export const skuChannelMatrix = [
  { sku: 'MLBB OOL', gt: 65_867_000, mt: 23_940_000, shopee: 45_331_500, tiktok1: 59_768_349, tiktok2: 11_237_500 },
  { sku: 'My Little Pony', gt: 27_654_000, mt: 12_240_000, shopee: 53_638_900, tiktok1: 29_600_693, tiktok2: 6_918_877 },
  { sku: 'MLBB HoD', gt: 2_100_000, mt: 0, shopee: 18_678_000, tiktok1: 28_974_512, tiktok2: 4_727_500 },
  { sku: 'Free Fire', gt: 0, mt: 38_400_000, shopee: 2_132_000, tiktok1: 31_376_789, tiktok2: 2_689_500 },
  { sku: 'NARUTO', gt: 1_080_000, mt: 272_160_000, shopee: 2_100_000, tiktok1: 1_710_000, tiktok2: 0 },
  { sku: 'Card Album', gt: 1_848_000, mt: 4_088_000, shopee: 0, tiktok1: 0, tiktok2: 0 },
  { sku: 'Scratch Card', gt: 1_649_000, mt: 1_149_000, shopee: 0, tiktok1: 0, tiktok2: 0 },
  { sku: 'Display Rack', gt: 7_000_000, mt: 400_000, shopee: 0, tiktok1: 0, tiktok2: 0 },
];

// SKU growth/drop lollipop
export const skuGrowthDrop = [
  { sku: 'MLBB OOL', growth: 28.5 },
  { sku: 'My Little Pony', growth: 22.1 },
  { sku: 'Free Fire', growth: 18.7 },
  { sku: 'MLBB HoD', growth: 15.2 },
  { sku: 'Card Album', growth: -8.3 },
  { sku: 'Scratch Card', growth: -12.1 },
  { sku: 'Display Rack', growth: -15.8 },
  { sku: 'Poster POSM', growth: -42.0 },
];

// Customer repeat buyer table
export const repeatBuyers = [
  { name: 'cardcollector_jkt', orders: 12, gmv: 3_420_300, firstOrder: '2026-04-01', lastOrder: '2026-04-30', channel: 'Marketplace', avgDaysBetween: 2.4 },
  { name: 'game_store_yk', orders: 15, gmv: 4_120_500, firstOrder: '2026-04-01', lastOrder: '2026-04-30', channel: 'Marketplace', avgDaysBetween: 1.9 },
  { name: 'hobby_mlbb_sby', orders: 8, gmv: 2_890_100, firstOrder: '2026-04-05', lastOrder: '2026-04-29', channel: 'Marketplace', avgDaysBetween: 3.4 },
  { name: 'PT Mitra Sejahtera', orders: 8, gmv: 28_731_200, firstOrder: '2026-04-02', lastOrder: '2026-04-28', channel: 'GT', avgDaysBetween: 3.7 },
  { name: 'CV Berkah Mandiri', orders: 6, gmv: 19_468_900, firstOrder: '2026-04-03', lastOrder: '2026-04-25', channel: 'GT', avgDaysBetween: 4.4 },
  { name: 'mlbb_fan_bdg', orders: 6, gmv: 1_850_200, firstOrder: '2026-04-03', lastOrder: '2026-04-27', channel: 'Marketplace', avgDaysBetween: 4.8 },
  { name: 'user_bali_23', orders: 5, gmv: 5_791_565, firstOrder: '2026-04-10', lastOrder: '2026-04-28', channel: 'Marketplace', avgDaysBetween: 4.5 },
  { name: 'Toko Kartu Bandung', orders: 5, gmv: 15_102_200, firstOrder: '2026-04-05', lastOrder: '2026-04-22', channel: 'GT', avgDaysBetween: 4.3 },
];

// Customer new vs repeat weekly trend
export const newVsRepeatTrend = [
  { week: 'Week 1', newCustomers: 420, repeatCustomers: 45 },
  { week: 'Week 2', newCustomers: 395, repeatCustomers: 68 },
  { week: 'Week 3', newCustomers: 380, repeatCustomers: 92 },
  { week: 'Week 4', newCustomers: 335, repeatCustomers: 107 },
];

// Data Quality: Duplicate orders
export const duplicateOrders = [
  { orderId: 'SO-20260415-0089', source: 'B2B GT', occurrences: 3, reason: 'Multi-line item order appearing as separate entries' },
  { orderId: 'SO-20260418-0102', source: 'B2B GT', occurrences: 2, reason: 'Duplicate file upload with overlapping date range' },
  { orderId: 'TT1-2604-00451', source: 'TikTok Shop (Kayou ID)', occurrences: 2, reason: 'Same order ID in two export batches' },
  { orderId: 'TT1-2604-00892', source: 'TikTok Shop (Kayou ID)', occurrences: 2, reason: 'Duplicate line item rows with identical SKU' },
  { orderId: 'SP-260401-12345', source: 'Shopee', occurrences: 2, reason: 'Re-uploaded file without replacing existing batch' },
];

// Data Quality: Zero-value items
export const zeroValueItems = [
  { source: 'TikTok Shop (Kayou ID)', productName: 'FREE GIFT - Kayou Scratch Card', count: 1_245, totalQty: 3_890 },
  { source: 'TikTok Shop (Kayou ID)', productName: 'BONUS - MLBB Poster A4', count: 892, totalQty: 1_120 },
  { source: 'TikTok Shop (Kayou Card ID)', productName: 'FREE - Card Album MLBB', count: 412, totalQty: 412 },
  { source: 'Shopee', productName: 'HADIAH - Scratch Card', count: 295, totalQty: 590 },
];

// Data Quality: Schema mismatch
export const schemaMismatches = [
  { file: 'raw_dashboard.xlsx', field: 'customer name', issue: 'Duplicate column name — appears twice, renamed to customer_name_order and customer_name_buyer', severity: 'warning' as const },
  { file: 'Order.all.20260401_20260430.xlsx', field: 'Total Pembayaran', issue: 'Contains IDR formatting (Rp) — needs numeric conversion', severity: 'warning' as const },
  { file: 'All order-2026-05-04-14_03.csv', field: 'Created Time', issue: 'Mixed date format (DD/MM/YYYY and MM/DD/YYYY)', severity: 'error' as const },
  { file: 'All order-2026-05-04-14_02.csv', field: 'SKU Subtotal After Discount', issue: '12 rows with non-numeric values', severity: 'error' as const },
  { file: 'raw_dashboard.xlsx', field: 'SKUGMV sku gmv', issue: '3 rows with negative values — potential refund entries', severity: 'info' as const },
];

// AI auto-generated insights
export const autoInsights = [
  { title: 'Cancellation Spike', description: 'TikTok Shop (Kayou Card ID) has 57.9% cancel rate — highest across all channels', severity: 'critical' as const, metric: 'Cancel Rate', value: '57.9%' },
  { title: 'MT Concentration Risk', description: 'Single NARUTO bulk order accounts for 65.8% of MT GMV (Rp 272.16M)', severity: 'warning' as const, metric: 'Concentration', value: '65.8%' },
  { title: 'Top GT Performer', description: 'Riky Marojahan Hasibuan leads GT with Rp 28.7M GMV across 14 orders', severity: 'info' as const, metric: 'GT GMV', value: 'Rp 28.7M' },
  { title: 'Zero-Value Items', description: '2,844 marketplace line items have Rp 0 value — likely gifts/bundles', severity: 'warning' as const, metric: 'Free Items', value: '2,844' },
  { title: 'Shopee Completion Rate', description: 'Shopee has the highest completion rate at 84.2% — outperforming TikTok', severity: 'info' as const, metric: 'Completion', value: '84.2%' },
  { title: 'Refund Impact', description: 'Total refund of Rp 124M — 14.5% of booked GMV lost to cancellation/refunds', severity: 'critical' as const, metric: 'Refund %', value: '14.5%' },
];

// Executive cancellation alert data
export const cancellationAlerts = [
  { channel: 'TikTok Shop (Kayou Card ID)', cancelRate: 57.9, cancelledOrders: 70, totalOrders: 121, refundAmount: 22_100_114 },
  { channel: 'TikTok Shop (Kayou ID)', cancelRate: 31.1, cancelledOrders: 470, totalOrders: 1_512, refundAmount: 101_954_301 },
  { channel: 'B2B GT+MT', cancelRate: 18.4, cancelledOrders: 19, totalOrders: 103, refundAmount: 33_709_300 },
  { channel: 'Shopee', cancelRate: 12.8, cancelledOrders: 130, totalOrders: 1_012, refundAmount: 16_252_538 },
];

// Upload processing steps
export const uploadProcessingSteps = [
  { step: 'Upload', status: 'completed' as const, description: 'File received and stored' },
  { step: 'Parse', status: 'completed' as const, description: 'Columns & rows extracted' },
  { step: 'Validate', status: 'completed' as const, description: 'Data quality checks passed' },
  { step: 'Transform', status: 'completed' as const, description: 'Normalization & deduplication' },
  { step: 'Aggregate', status: 'completed' as const, description: 'Analytics mart generated' },
  { step: 'Ready', status: 'completed' as const, description: 'Dashboard data available' },
];

// Operations: Order Aging
export const orderAging = [
  { bracket: '0-1 Days', count: 145, percentage: 45.3 },
  { bracket: '2-3 Days', count: 98, percentage: 30.6 },
  { bracket: '4-7 Days', count: 52, percentage: 16.3 },
  { bracket: '8-14 Days', count: 18, percentage: 5.6 },
  { bracket: '> 14 Days', count: 7, percentage: 2.2 },
];

// Operations: Cancel Reasons
export const cancelReasons = [
  { reason: 'Customer Changed Mind', count: 285, percentage: 41.3 },
  { reason: 'Payment Timeout', count: 164, percentage: 23.8 },
  { reason: 'Out of Stock', count: 112, percentage: 16.2 },
  { reason: 'Shipping Cost Too High', count: 78, percentage: 11.3 },
  { reason: 'Fraud Suspected', count: 32, percentage: 4.6 },
  { reason: 'Other', count: 18, percentage: 2.6 },
];
