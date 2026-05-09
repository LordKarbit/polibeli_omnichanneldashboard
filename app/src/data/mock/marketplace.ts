import type { MarketplacePerformance, MarketplaceSKU, OrderStatus } from './types';

export const marketplacePerformance: MarketplacePerformance[] = [
  { marketplace: 'TikTok Shop (Kayou ID)', marketplaceKey: 'tiktok1', orders: 1512, bookedGMV: 196_755_985, activeGMV: 89_726_902, aov: 130_130, refundAmount: 101_954_301, skuGrossSales: 188_638_470 },
  { marketplace: 'Shopee', marketplaceKey: 'shopee', orders: 1012, bookedGMV: 103_053_453, activeGMV: 103_053_453, aov: 101_831, refundAmount: 0, skuGrossSales: 140_982_686 },
  { marketplace: 'TikTok Shop (Kayou Card ID)', marketplaceKey: 'tiktok2', orders: 121, bookedGMV: 33_867_856, activeGMV: 9_761_579, aov: 279_900, refundAmount: 22_100_114, skuGrossSales: 30_211_433 },
];

export const marketplaceSKUs: MarketplaceSKU[] = [
  { sellerSKU: '6937187412330*30', productName: '1 BOX 30 PACK KAYOU MLBB ORIGIN OF LEGEND', skuGMV: 116_337_349, quantity: 480, orders: 382, tiktok1: 59_768_349, tiktok2: 11_237_500, shopee: 45_331_500 },
  { sellerSKU: '6937187407275*30', productName: '1 BOX 30 PACK KAYOU MY LITTLE PONNY CR', skuGMV: 90_158_470, quantity: 495, orders: 461, tiktok1: 29_600_693, tiktok2: 6_918_877, shopee: 53_638_900 },
  { sellerSKU: '6937187409163*20', productName: '1 BOX 20 PACK KAYOU MLBB Hand of Destiny', skuGMV: 52_380_012, quantity: 180, orders: 168, tiktok1: 28_974_512, tiktok2: 4_727_500, shopee: 18_678_000 },
  { sellerSKU: '6937187407367*20', productName: '1 BOX 20 PACK KAYOU FREE FIRE Final Survivor', skuGMV: 36_198_289, quantity: 120, orders: 114, tiktok1: 31_376_789, tiktok2: 2_689_500, shopee: 2_132_000 },
  { sellerSKU: '6937187407275*2', productName: '2 PACK KAYOU MY LITTLE PONNY CR', skuGMV: 13_206_593, quantity: 1014, orders: 690, tiktok1: 6_746_173, tiktok2: 56_900, shopee: 6_403_520 },
  { sellerSKU: '6937187407275*10', productName: '10 Paket KAYOU My Little Pony', skuGMV: 10_700_364, quantity: 200, orders: 185, tiktok1: 10_186_722, tiktok2: 513_642, shopee: 0 },
];

export const orderStatuses: OrderStatus[] = [
  { source: 'B2B GT+MT', status: 'Received', orders: 71, percentWithinSource: 68.9 },
  { source: 'B2B GT+MT', status: 'Cancelled', orders: 19, percentWithinSource: 18.4 },
  { source: 'B2B GT+MT', status: 'Pending Receipt', orders: 12, percentWithinSource: 11.7 },
  { source: 'B2B GT+MT', status: 'Pending Shipment', orders: 1, percentWithinSource: 1.0 },
  { source: 'TikTok Shop (Kayou ID)', status: 'Shipped', orders: 584, percentWithinSource: 38.6 },
  { source: 'TikTok Shop (Kayou ID)', status: 'Canceled', orders: 470, percentWithinSource: 31.1 },
  { source: 'TikTok Shop (Kayou ID)', status: 'Completed', orders: 458, percentWithinSource: 30.3 },
  { source: 'TikTok Shop (Kayou Card ID)', status: 'Canceled', orders: 70, percentWithinSource: 57.9 },
  { source: 'TikTok Shop (Kayou Card ID)', status: 'Completed', orders: 33, percentWithinSource: 27.3 },
  { source: 'TikTok Shop (Kayou Card ID)', status: 'Shipped', orders: 18, percentWithinSource: 14.9 },
  { source: 'Shopee', status: 'Selesai', orders: 852, percentWithinSource: 84.2 },
  { source: 'Shopee', status: 'Batal', orders: 130, percentWithinSource: 12.8 },
  { source: 'Shopee', status: 'Sedang Dikirim', orders: 19, percentWithinSource: 1.9 },
  { source: 'Shopee', status: 'Telah Dikirim', orders: 11, percentWithinSource: 1.1 },
];
