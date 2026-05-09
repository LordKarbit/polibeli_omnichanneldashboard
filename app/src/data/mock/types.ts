export interface KPIData {
  label: string;
  value: number;
  formattedValue: string;
  change: number;       // percentage change vs previous period
  changeLabel: string;
  icon: string;         // lucide icon name
  format: 'currency' | 'number' | 'percent';
}

export interface ChannelContribution {
  channel: string;
  channelKey: string;
  orders: number;
  bookedGMV: number;
  activeGMV: number;
  aov: number;
  percentage: number;
}

export interface DailyGMV {
  date: string;
  gt: number;
  mt: number;
  shopee: number;
  tiktok1: number;
  tiktok2: number;
  total: number;
}

export interface ManagerPerformance {
  name: string;
  role: 'regional_manager' | 'area_manager';
  parentManager?: string;
  orders: number;
  activeOrders: number;
  bookedGMV: number;
  activeGMV: number;
  quantity: number;
  customers: number;
  percentageOfGT: number;
}

export interface SKUPerformance {
  skuCode: string;
  skuName: string;
  totalGMV: number;
  gtGMV: number;
  mtGMV: number;
  quantity: number;
  orders: number;
  channel?: string;
}

export interface MarketplaceSKU {
  sellerSKU: string;
  productName: string;
  skuGMV: number;
  quantity: number;
  orders: number;
  tiktok1: number;
  tiktok2: number;
  shopee: number;
}

export interface MarketplacePerformance {
  marketplace: string;
  marketplaceKey: string;
  orders: number;
  bookedGMV: number;
  activeGMV: number;
  aov: number;
  refundAmount: number;
  skuGrossSales: number;
}

export interface OrderStatus {
  source: string;
  status: string;
  orders: number;
  percentWithinSource: number;
}

export interface GeoSales {
  source: string;
  province: string;
  city: string;
  orders: number;
  gmv: number;
}

export interface DataQualityMetric {
  category: string;
  count: number;
  severity: 'error' | 'warning' | 'info';
  description: string;
}

export interface LocationGMV {
  source: string;
  province: string;
  city: string;
  orders: number;
  gmv: number;
}

export interface OrderStatusDetail {
  source: string;
  status: string;
  orders: number;
  gmv: number;
  percentage: number;
}

export interface CustomerData {
  name: string;
  type: string;
  orders: number;
  totalGMV: number;
  firstOrder: string;
  lastOrder: string;
  channel: string;
}

export interface OperationsMetric {
  label: string;
  value: number | string;
  change: number;
  icon: string;
}
