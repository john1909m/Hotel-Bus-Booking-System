export type paymentMethod = 
'CREDIT_CARD' |
'DEBIT_CARD' |
'PAYPAL' |
'BANK_TRANSFER';

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