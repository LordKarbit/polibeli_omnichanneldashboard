import type { DataQualityMetric } from './types';

export const dataQualityMetrics: DataQualityMetric[] = [
  { category: 'Missing Order ID', count: 3, severity: 'error', description: 'Rows with empty or null order ID' },
  { category: 'Missing SKU Code', count: 15, severity: 'warning', description: 'Line items without SKU code mapping' },
  { category: 'Invalid GMV', count: 7, severity: 'error', description: 'Non-numeric or negative GMV values' },
  { category: 'Duplicate Orders', count: 42, severity: 'warning', description: 'Same order ID appearing in multiple uploads' },
  { category: 'Zero-Value Items', count: 2844, severity: 'info', description: 'Marketplace free items / gifts / bundles' },
  { category: 'Cancelled with GMV', count: 689, severity: 'warning', description: 'Cancelled orders still showing GMV value' },
  { category: 'Unmatched SKU Alias', count: 28, severity: 'warning', description: 'SKU codes not mapped to canonical SKU' },
  { category: 'Date Format Issues', count: 5, severity: 'info', description: 'Ambiguous or unparseable date fields' },
];

export const dataQualitySummary = {
  totalRows: 5_897,
  validRows: 5_812,
  validPercent: 98.6,
  issuesFound: 3_633,
  criticalIssues: 10,
  warningIssues: 779,
  infoIssues: 2_849,
};

export const recentUploads = [
  { id: '1', fileName: 'raw_dashboard.xlsx - export.csv', source: 'B2B GT/MT', rows: 364, status: 'success' as const, uploadedAt: '2026-04-30 14:22', issues: 3 },
  { id: '2', fileName: 'Order.all.20260401_20260430.xlsx', source: 'Shopee', rows: 2089, status: 'success' as const, uploadedAt: '2026-04-30 14:25', issues: 12 },
  { id: '3', fileName: 'All order-2026-05-04-14_03.csv', source: 'TikTok Shop (Kayou ID)', rows: 3180, status: 'success' as const, uploadedAt: '2026-05-04 14:03', issues: 8 },
  { id: '4', fileName: 'All order-2026-05-04-14_02.csv', source: 'TikTok Shop (Kayou Card ID)', rows: 264, status: 'success' as const, uploadedAt: '2026-05-04 14:02', issues: 5 },
];
