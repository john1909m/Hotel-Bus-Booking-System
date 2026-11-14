export interface AnalyticsPaymentItemDto {
  paymentMethod: string;
  paymentStatus: string;
  count: number;
  amount: number;
}

export interface AnalyticsPaymentsResponseDto {
  items: AnalyticsPaymentItemDto[];
}
