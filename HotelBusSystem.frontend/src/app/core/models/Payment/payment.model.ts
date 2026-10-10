export type paymentMethod = 
'CREDIT_CARD' |
'DEPIT_CARD' |
'PAYPAL' |
'BANK_TRANFER';

export type paymentStatus = 
'PENDING' |
'PROCESSING' |
'COMPLETED' |
'FAILED' |
'REFUNDED';

export interface PaymentDTO {
    id: number;
    amount: number;
    paymentMethod: paymentMethod;
    paymentStatus: paymentStatus;
    transactionDate: string;
    hotelBookingId: number;
    busBookingId: number;
}

export interface PaymentRequestDTO {
    amount: number;
    paymentMethod: paymentMethod;
    paymentStatus: paymentStatus;
    transactionDate: string;
    hotelBookingId: number;
    busBookingId: number;
}