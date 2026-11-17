export interface BusFeatureDto {
  id: number;
  code: string;
  nameKey: string;
  surcharge: number;
  active: boolean;
}

export interface BusFeatureRequestDto {
  code: string;
  nameKey: string;
  surcharge: number;
  active: boolean;
}

export interface BusPricingUpdateRequestDto {
  priceFactor: number;
  featureIds: number[];
}
