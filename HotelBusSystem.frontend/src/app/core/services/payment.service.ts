import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PaymentDTO, PaymentRequestDTO } from '../models/Payment/payment.model';
import { environment } from '../../../environments/environment';
import { handleError } from '../../../utils/ErrorHandling';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly apiUrl = `${environment.apiBaseUrl}/payments`;
  private readonly http = inject(HttpClient);

  /**
   * GET /payments
   * Get all payments (Admin).
   * Response: PaymentDTO[]
   */
  getPayments(): Observable<PaymentDTO[]> {
    return this.http.get<PaymentDTO[]>(this.apiUrl).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /payments
   * Convenience alias for getPayments().
   */
  getAllPayments(): Observable<PaymentDTO[]> {
    return this.getPayments();
  }

  /**
   * GET /payments/{id}
   * Get specific payment by ID.
   * Response: PaymentDTO
   */
  getPaymentById(id: number): Observable<PaymentDTO> {
    return this.http.get<PaymentDTO>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * GET /payments/hotel-booking/{hotelBookingId}
   * Get payments for a specific Hotel Booking ID.
   * Response: PaymentDTO[]
   */
  getPaymentsByHotelBookingId(hotelBookingId: number): Observable<PaymentDTO[]> {
    return this.http.get<PaymentDTO[]>(`${this.apiUrl}/hotel-booking/${hotelBookingId}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * Alias for backward compatibility
   */
  getPaymentByHotelBookingId(hotelBookingId: number): Observable<PaymentDTO[]> {
    return this.getPaymentsByHotelBookingId(hotelBookingId);
  }

  /**
   * GET /payments/bus-booking/{busBookingId}
   * Get payments for a specific Bus Booking ID.
   * Response: PaymentDTO[]
   */
  getPaymentsByBusBookingId(busBookingId: number): Observable<PaymentDTO[]> {
    return this.http.get<PaymentDTO[]>(`${this.apiUrl}/bus-booking/${busBookingId}`).pipe(
      catchError(handleError)
    );
  }

  /**
   * Alias for backward compatibility
   */
  getPaymentByBusBookingId(busBookingId: number): Observable<PaymentDTO[]> {
    return this.getPaymentsByBusBookingId(busBookingId);
  }

  /**
   * POST /payments
   * Create a new payment (User).
   * Request Body: PaymentRequestDTO
   * Response: PaymentDTO
   */
  createPayment(payload: PaymentRequestDTO): Observable<PaymentDTO> {
    return this.http.post<PaymentDTO>(this.apiUrl, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * PUT /payments/{id}
   * Update payment data.
   * Request Body: PaymentRequestDTO
   * Response: PaymentDTO
   */
  updatePayment(id: number, payload: PaymentRequestDTO): Observable<PaymentDTO> {
    return this.http.put<PaymentDTO>(`${this.apiUrl}/${id}`, payload).pipe(
      catchError(handleError)
    );
  }

  /**
   * DELETE /payments/{id}
   * Delete payment.
   * Response: void (HTTP 204 No Content)
   */
  deletePayment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(handleError)
    );
  }

}
