import type { LocationGMV, OrderStatusDetail, CustomerData, OperationsMetric } from './types';

// §1.8 Top Location by GMV
export const locationData: LocationGMV[] = [
  { source: 'B2B MT', province: 'Agency', city: 'Agency', orders: 10, gmv: 406_918_000 },
  { source: 'B2B GT', province: 'Jawa Timur', city: 'Surabaya', orders: 17, gmv: 19_468_900 },
  { source: 'B2B GT', province: 'DKI Jakarta', city: 'Depok', orders: 9, gmv: 19_427_800 },
  { source: 'B2B GT', province: 'Jawa Barat', city: 'Bekasi', orders: 12, gmv: 15_102_200 },
  { source: 'B2B GT', province: 'Jawa Barat', city: 'Bandung', orders: 13, gmv: 12_667_700 },
  { source: 'B2B GT', province: 'Jawa Tengah', city: 'Yogyakarta', orders: 15, gmv: 12_610_200 },
  { source: 'B2B GT', province: 'Jawa Tengah', city: 'Semarang & Demak', orders: 11, gmv: 9_774_600 },
  { source: 'B2B MT', province: 'Other', city: 'Agency', orders: 2, gmv: 6_900_000 },
  { source: 'B2B GT', province: 'DKI Jakarta', city: 'Jakarta Timur', orders: 1, gmv: 6_356_100 },
  { source: 'Shopee', province: 'DKI Jakarta', city: 'Kota Jakarta Timur', orders: 53, gmv: 6_055_768 },
  { source: 'TikTok Shop (Kayou ID)', province: 'Bali', city: 'Kab. Klungkung', orders: 5, gmv: 5_791_565 },
  { source: 'Shopee', province: 'Jawa Timur', city: 'Kota Surabaya', orders: 49, gmv: 5_582_392 },
  { source: 'TikTok Shop (Kayou ID)', province: 'Jawa Barat', city: 'Kota Bandung', orders: 32, gmv: 4_890_200 },
  { source: 'TikTok Shop (Kayou ID)', province: 'DKI Jakarta', city: 'Kota Jakarta Selatan', orders: 28, gmv: 4_215_300 },
  { source: 'Shopee', province: 'Jawa Barat', city: 'Kota Bekasi', orders: 41, gmv: 3_980_100 },
  { source: 'TikTok Shop (Kayou ID)', province: 'Jawa Timur', city: 'Kota Malang', orders: 18, gmv: 3_150_800 },
  { source: 'Shopee', province: 'Jawa Tengah', city: 'Kota Semarang', orders: 22, gmv: 2_870_500 },
  { source: 'TikTok Shop (Kayou Card ID)', province: 'DKI Jakarta', city: 'Kota Jakarta Timur', orders: 15, gmv: 2_540_000 },
];

export const provinceGMV = [
  { province: 'Jawa Timur', gmv: 34_672_492, orders: 135 },
  { province: 'DKI Jakarta', gmv: 43_595_168, orders: 106 },
  { province: 'Jawa Barat', gmv: 36_640_200, orders: 98 },
  { province: 'Jawa Tengah', gmv: 25_255_300, orders: 48 },
  { province: 'Bali', gmv: 5_791_565, orders: 5 },
  { province: 'Sumatera Utara', gmv: 3_210_400, orders: 18 },
  { province: 'Sulawesi Selatan', gmv: 2_140_300, orders: 12 },
  { province: 'Kalimantan Timur', gmv: 1_890_600, orders: 9 },
];

// Heatmap: city × channel
export const cityChannelHeatmap = [
  // [cityIndex, channelIndex, gmvValue]
  { city: 'Surabaya', channel: 'GT', gmv: 19_468_900 },
  { city: 'Surabaya', channel: 'Shopee', gmv: 5_582_392 },
  { city: 'Surabaya', channel: 'TT Kayou ID', gmv: 3_150_800 },
  { city: 'Jakarta Timur', channel: 'GT', gmv: 6_356_100 },
  { city: 'Jakarta Timur', channel: 'Shopee', gmv: 6_055_768 },
  { city: 'Jakarta Timur', channel: 'TT Kayou Card', gmv: 2_540_000 },
  { city: 'Bekasi', channel: 'GT', gmv: 15_102_200 },
  { city: 'Bekasi', channel: 'Shopee', gmv: 3_980_100 },
  { city: 'Bandung', channel: 'GT', gmv: 12_667_700 },
  { city: 'Bandung', channel: 'TT Kayou ID', gmv: 4_890_200 },
  { city: 'Bandung', channel: 'Shopee', gmv: 2_870_500 },
  { city: 'Yogyakarta', channel: 'GT', gmv: 12_610_200 },
  { city: 'Semarang', channel: 'GT', gmv: 9_774_600 },
  { city: 'Semarang', channel: 'Shopee', gmv: 2_870_500 },
  { city: 'Depok', channel: 'GT', gmv: 19_427_800 },
  { city: 'Klungkung', channel: 'TT Kayou ID', gmv: 5_791_565 },
];

// §1.7 Order status - detailed for Operations page
export const orderStatusDetails: OrderStatusDetail[] = [
  { source: 'B2B GT+MT', status: 'Received', orders: 71, gmv: 487_312_000, percentage: 68.9 },
  { source: 'B2B GT+MT', status: 'Cancelled', orders: 19, gmv: 33_709_300, percentage: 18.4 },
  { source: 'B2B GT+MT', status: 'Pending Receipt', orders: 12, gmv: 0, percentage: 11.7 },
  { source: 'B2B GT+MT', status: 'Pending Shipment', orders: 1, gmv: 0, percentage: 1.0 },
  { source: 'TikTok Shop (Kayou ID)', status: 'Shipped', orders: 584, gmv: 78_420_100, percentage: 38.6 },
  { source: 'TikTok Shop (Kayou ID)', status: 'Canceled', orders: 470, gmv: 107_029_083, percentage: 31.1 },
  { source: 'TikTok Shop (Kayou ID)', status: 'Completed', orders: 458, gmv: 89_726_902, percentage: 30.3 },
  { source: 'TikTok Shop (Kayou Card ID)', status: 'Canceled', orders: 70, gmv: 24_106_277, percentage: 57.9 },
  { source: 'TikTok Shop (Kayou Card ID)', status: 'Completed', orders: 33, gmv: 9_761_579, percentage: 27.3 },
  { source: 'TikTok Shop (Kayou Card ID)', status: 'Shipped', orders: 18, gmv: 0, percentage: 14.9 },
  { source: 'Shopee', status: 'Selesai', orders: 852, gmv: 86_800_915, percentage: 84.2 },
  { source: 'Shopee', status: 'Batal', orders: 130, gmv: 16_252_538, percentage: 12.8 },
  { source: 'Shopee', status: 'Sedang Dikirim', orders: 19, gmv: 0, percentage: 1.9 },
  { source: 'Shopee', status: 'Telah Dikirim', orders: 11, gmv: 0, percentage: 1.1 },
];

// Cancellation daily trend mock
export const cancellationTrend = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-04-${String(i + 1).padStart(2, '0')}`,
  cancelled: Math.floor(5 + Math.random() * 25),
  pending: Math.floor(2 + Math.random() * 10),
  completed: Math.floor(20 + Math.random() * 60),
}));

// Operations metrics
export const operationsMetrics: OperationsMetric[] = [
  { label: 'Total Cancelled', value: 689, change: 12.3, icon: 'XCircle' },
  { label: 'Pending Orders', value: 32, change: -8.1, icon: 'Clock' },
  { label: 'Total Refund', value: 124_054_415, change: 5.2, icon: 'RotateCcw' },
  { label: 'Avg Fulfillment', value: '2.3 days', change: -15.0, icon: 'Truck' },
];

// Customer/Buyer data
export const customerData: CustomerData[] = [
  { name: 'PT Mitra Sejahtera', type: 'Reseller', orders: 8, totalGMV: 28_731_200, firstOrder: '2026-04-02', lastOrder: '2026-04-28', channel: 'GT' },
  { name: 'CV Berkah Mandiri', type: 'Reseller', orders: 6, totalGMV: 19_468_900, firstOrder: '2026-04-03', lastOrder: '2026-04-25', channel: 'GT' },
  { name: 'Toko Kartu Bandung', type: 'Reseller', orders: 5, totalGMV: 15_102_200, firstOrder: '2026-04-05', lastOrder: '2026-04-22', channel: 'GT' },
  { name: 'Agency Bulk Order', type: 'Agency', orders: 10, totalGMV: 406_918_000, firstOrder: '2026-04-01', lastOrder: '2026-04-30', channel: 'MT' },
  { name: 'user_bali_23', type: 'End Customer', orders: 5, totalGMV: 5_791_565, firstOrder: '2026-04-10', lastOrder: '2026-04-28', channel: 'Marketplace' },
  { name: 'cardcollector_jkt', type: 'End Customer', orders: 12, totalGMV: 3_420_300, firstOrder: '2026-04-01', lastOrder: '2026-04-30', channel: 'Marketplace' },
  { name: 'hobby_mlbb_sby', type: 'End Customer', orders: 8, totalGMV: 2_890_100, firstOrder: '2026-04-05', lastOrder: '2026-04-29', channel: 'Marketplace' },
  { name: 'Toko Game Semarang', type: 'Reseller', orders: 4, totalGMV: 9_774_600, firstOrder: '2026-04-08', lastOrder: '2026-04-20', channel: 'GT' },
  { name: 'mlbb_fan_bdg', type: 'End Customer', orders: 6, totalGMV: 1_850_200, firstOrder: '2026-04-03', lastOrder: '2026-04-27', channel: 'Marketplace' },
  { name: 'CV Jaya Abadi', type: 'Reseller', orders: 3, totalGMV: 12_667_700, firstOrder: '2026-04-10', lastOrder: '2026-04-18', channel: 'GT' },
  { name: 'game_store_yk', type: 'End Customer', orders: 15, totalGMV: 4_120_500, firstOrder: '2026-04-01', lastOrder: '2026-04-30', channel: 'Marketplace' },
  { name: 'kartu_koleksi_dpk', type: 'End Customer', orders: 9, totalGMV: 2_310_700, firstOrder: '2026-04-02', lastOrder: '2026-04-29', channel: 'Marketplace' },
];

export const customerRepeatStats = {
  totalCustomers: 1_842,
  repeatCustomers: 312,
  repeatRate: 16.9,
  newCustomers: 1_530,
  avgOrdersPerRepeat: 3.2,
};
