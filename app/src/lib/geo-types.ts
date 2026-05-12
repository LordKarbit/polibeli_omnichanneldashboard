export interface LocationGMV {
  source: string;
  channelKey?: string;
  province: string;
  city: string;
  district?: string | null;
  orders: number;
  gmv: number;
  activeGMV?: number;
  cancellationValue?: number;
  regionalManager?: string | null;
  areaManager?: string | null;
}
