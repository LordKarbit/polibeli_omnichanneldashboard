import type { SKUPerformance } from './types';

export const allSKUs: SKUPerformance[] = [
  // B2B SKUs
  { skuCode: 'NR-KP-DZJ-001-SEA', skuName: 'Kayou - NARUTO Earth Scroll Series 1S', totalGMV: 273_240_000, gtGMV: 1_080_000, mtGMV: 272_160_000, quantity: 1_518, orders: 7, channel: 'B2B' },
  { skuCode: 'KYID000001', skuName: 'Kayou - MLBB ORIGIN OF LEGEND', totalGMV: 89_807_000, gtGMV: 65_867_000, mtGMV: 23_940_000, quantity: 554, orders: 82, channel: 'B2B' },
  { skuCode: 'MLP-KP-YH-QY-002-SEA', skuName: 'Kayou - My Little Pony Fun Moments', totalGMV: 39_894_000, gtGMV: 27_654_000, mtGMV: 12_240_000, quantity: 241, orders: 40, channel: 'B2B' },
  { skuCode: 'KYID000004', skuName: 'MLBB-HOD-1 packSet', totalGMV: 38_400_000, gtGMV: 0, mtGMV: 38_400_000, quantity: 1_920, orders: 2, channel: 'B2B' },
  { skuCode: 'KYID000005', skuName: 'Free Fire Final Survivor Survival Pack', totalGMV: 38_400_000, gtGMV: 0, mtGMV: 38_400_000, quantity: 1_920, orders: 2, channel: 'B2B' },
  { skuCode: 'MLBB-KP-GXMY-001B-SEA', skuName: 'MLBB-OOL-1 packSet', totalGMV: 23_040_000, gtGMV: 0, mtGMV: 23_040_000, quantity: 2_880, orders: 2, channel: 'B2B' },
  { skuCode: 'POSM-Kayou-MLBB-01', skuName: 'Kayou - MLBB Display Rack', totalGMV: 7_400_000, gtGMV: 7_000_000, mtGMV: 400_000, quantity: 41, orders: 38, channel: 'B2B' },
  { skuCode: 'kayou-card_album-MLBB', skuName: 'Kayou - Card Album MLBB', totalGMV: 5_936_000, gtGMV: 1_848_000, mtGMV: 4_088_000, quantity: 216, orders: 22, channel: 'B2B' },
  { skuCode: 'KYWL680000020', skuName: 'Kayou - Scratch Card', totalGMV: 2_798_000, gtGMV: 1_649_000, mtGMV: 1_149_000, quantity: 29_690, orders: 96, channel: 'B2B' },
  { skuCode: 'MLBB-KP-GXMY-001A-SEA', skuName: 'Kayou - MLBB Hand of Destiny', totalGMV: 2_100_000, gtGMV: 2_100_000, mtGMV: 0, quantity: 7, orders: 2, channel: 'B2B' },
];

export const skuByIP = [
  { ip: 'MLBB', gmv: 260_683_000, percentage: 50.0 },
  { ip: 'Naruto', gmv: 273_240_000, percentage: 26.0 },
  { ip: 'My Little Pony', gmv: 39_894_000, percentage: 7.6 },
  { ip: 'Free Fire', gmv: 38_400_000, percentage: 7.4 },
  { ip: 'POSM/Supporting', gmv: 16_134_000, percentage: 3.1 },
];

export const skuTypes = [
  { type: 'Paid Product', count: 6, gmv: 505_481_000, percentage: 78.2 },
  { type: 'POSM', count: 2, gmv: 7_405_300, percentage: 1.1 },
  { type: 'Supporting Material', count: 1, gmv: 2_798_000, percentage: 0.4 },
  { type: 'Marketplace Bundle', count: 12, gmv: 359_832_589, percentage: 20.3 },
];
