import type { ManagerPerformance, SKUPerformance } from './types';

export const regionalManagers: ManagerPerformance[] = [
  { name: 'Nur Setyo Aji', role: 'regional_manager', orders: 70, activeOrders: 57, bookedGMV: 70_721_700, activeGMV: 68_271_400, quantity: 11_885, customers: 48, percentageOfGT: 66.0 },
  { name: 'Hakim Abdul Aziz', role: 'regional_manager', orders: 21, activeOrders: 16, bookedGMV: 36_481_600, activeGMV: 36_481_600, quantity: 7_117, customers: 12, percentageOfGT: 34.0 },
];

export const areaManagers: ManagerPerformance[] = [
  { name: 'Riky Marojahan Hasibuan', role: 'area_manager', parentManager: 'Hakim Abdul Aziz', orders: 14, activeOrders: 12, bookedGMV: 28_731_200, activeGMV: 28_731_200, quantity: 5_347, customers: 8, percentageOfGT: 26.8 },
  { name: 'Wahyu Kusuma Nugroho', role: 'area_manager', parentManager: 'Nur Setyo Aji', orders: 18, activeOrders: 15, bookedGMV: 19_468_900, activeGMV: 19_468_900, quantity: 3_168, customers: 14, percentageOfGT: 18.2 },
  { name: 'Nur Setyo Aji', role: 'area_manager', parentManager: 'Nur Setyo Aji', orders: 12, activeOrders: 12, bookedGMV: 15_102_200, activeGMV: 15_102_200, quantity: 2_371, customers: 11, percentageOfGT: 14.1 },
  { name: 'Pungguh Ikhsan Priyombodo', role: 'area_manager', parentManager: 'Nur Setyo Aji', orders: 16, activeOrders: 10, bookedGMV: 13_708_300, activeGMV: 11_258_000, quantity: 2_618, customers: 8, percentageOfGT: 12.8 },
  { name: 'Lamsihar Sitorus', role: 'area_manager', parentManager: 'Nur Setyo Aji', orders: 13, activeOrders: 12, bookedGMV: 12_667_700, activeGMV: 12_667_700, quantity: 2_034, customers: 11, percentageOfGT: 11.8 },
  { name: 'Muliyawarman Muchtar', role: 'area_manager', parentManager: 'Nur Setyo Aji', orders: 11, activeOrders: 8, bookedGMV: 9_774_600, activeGMV: 9_774_600, quantity: 1_694, customers: 4, percentageOfGT: 9.1 },
  { name: 'Yoppi Dwi Ariesanto', role: 'area_manager', parentManager: 'Hakim Abdul Aziz', orders: 7, activeOrders: 4, bookedGMV: 7_750_400, activeGMV: 7_750_400, quantity: 1_770, customers: 4, percentageOfGT: 7.2 },
];

export const gtSKUs: SKUPerformance[] = [
  { skuCode: 'KYID000001', skuName: 'Kayou - MLBB ORIGIN OF LEGEND', totalGMV: 89_807_000, gtGMV: 65_867_000, mtGMV: 23_940_000, quantity: 554, orders: 82 },
  { skuCode: 'MLP-KP-YH-QY-002-SEA', skuName: 'Kayou - My Little Pony Fun Moments', totalGMV: 39_894_000, gtGMV: 27_654_000, mtGMV: 12_240_000, quantity: 241, orders: 40 },
  { skuCode: 'POSM-Kayou-MLBB-01', skuName: 'Kayou - MLBB Display Rack', totalGMV: 7_400_000, gtGMV: 7_000_000, mtGMV: 400_000, quantity: 41, orders: 38 },
  { skuCode: 'MLBB-KP-GXMY-001A-SEA', skuName: 'Kayou - MLBB Hand of Destiny', totalGMV: 2_100_000, gtGMV: 2_100_000, mtGMV: 0, quantity: 7, orders: 2 },
  { skuCode: 'kayou-card_album-MLBB', skuName: 'Kayou - Card Album MLBB', totalGMV: 5_936_000, gtGMV: 1_848_000, mtGMV: 4_088_000, quantity: 216, orders: 22 },
  { skuCode: 'KYWL680000020', skuName: 'Kayou - Scratch Card', totalGMV: 2_798_000, gtGMV: 1_649_000, mtGMV: 1_149_000, quantity: 29_690, orders: 96 },
  { skuCode: 'NR-KP-DZJ-001-SEA', skuName: 'Kayou - NARUTO Earth Scroll', totalGMV: 273_240_000, gtGMV: 1_080_000, mtGMV: 272_160_000, quantity: 1_518, orders: 7 },
  { skuCode: 'POSM-Kayou-Poster-2', skuName: 'Kayou - Poster POSM A4', totalGMV: 5_300, gtGMV: 5_300, mtGMV: 0, quantity: 66, orders: 5 },
];
