import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { extractErrorMessage, handleError, ApiErrorResponse } from './ErrorHandling';
import { firstValueFrom } from 'rxjs';

describe('ErrorHandling', () => {
  it('should return fallback message when error is null or undefined', () => {
    expect(extractErrorMessage(null)).toBe('An unexpected error occurred. Please try again.');
    expect(extractErrorMessage(undefined, 'Custom fallback')).toBe('Custom fallback');
  });

  it('should return string error directly', () => {
    expect(extractErrorMessage('Direct error message')).toBe('Direct error message');
  });

  it('should extract message from simple Error object', () => {
    expect(extractErrorMessage(new Error('Something failed'))).toBe('Something failed');
  });

  it('should extract structured field validation errors from ApiErrorResponse', () => {
    const errorBody: ApiErrorResponse = {
      timestamp: '2026-11-16T01:00:00Z',
      status: 400,
      code: 'VALIDATION_FAILED',
      message: 'checkIn must not be null',
      path: '/api/hotel-bookings',
      errors: [
        { field: 'checkOut', message: 'checkOut must not be null' },
        { field: 'checkIn', message: 'checkIn must not be null' },
      ],
    };
    const httpErr = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      error: errorBody,
    });

    const msg = extractErrorMessage(httpErr);
    expect(msg).toBe('checkOut must not be null; checkIn must not be null');
  });

  it('should extract domain error message for 409 Conflict', () => {
    const errorBody: ApiErrorResponse = {
      status: 409,
      code: 'ROOM_UNAVAILABLE',
      message: 'Room 101 is not available for the selected dates',
      path: '/api/hotel-bookings',
    };
    const httpErr = new HttpErrorResponse({
      status: 409,
      statusText: 'Conflict',
      error: errorBody,
    });

    expect(extractErrorMessage(httpErr)).toBe('Room 101 is not available for the selected dates');
  });

  it('should extract backend message for 401 Unauthorized', () => {
    const httpErr = new HttpErrorResponse({
      status: 401,
      statusText: 'Unauthorized',
      error: { error: 'Unauthorized', message: 'Invalid credentials' },
    });

    expect(extractErrorMessage(httpErr)).toBe('Invalid credentials');
  });

  it('should extract backend message for 403 Forbidden', () => {
    const httpErr = new HttpErrorResponse({
      status: 403,
      statusText: 'Forbidden',
      error: { error: 'Forbidden', message: 'Access denied. You do not have permission for this action.' },
    });

    expect(extractErrorMessage(httpErr)).toBe('Access denied. You do not have permission for this action.');
  });

  it('should extract backend message for 410 Draft Expired', () => {
    const httpErr = new HttpErrorResponse({
      status: 410,
      statusText: 'Gone',
      error: { code: 'DRAFT_EXPIRED', message: 'Booking draft has expired' },
    });

    expect(extractErrorMessage(httpErr)).toBe('Booking draft has expired');
  });

  it('should extract backend message for 429 Rate Limit', () => {
    const httpErr = new HttpErrorResponse({
      status: 429,
      statusText: 'Too Many Requests',
      error: { code: 'AI_RATE_LIMIT', message: 'Too many requests. Please wait a moment and try again.' },
    });

    expect(extractErrorMessage(httpErr)).toBe('Too many requests. Please wait a moment and try again.');
  });

  it('should extract backend message for 503 Service Unavailable', () => {
    const httpErr = new HttpErrorResponse({
      status: 503,
      statusText: 'Service Unavailable',
      error: { code: 'AI_SERVICE_UNAVAILABLE', message: 'AI assistant is temporarily unavailable. Please try again later.' },
    });

    expect(extractErrorMessage(httpErr)).toBe('AI assistant is temporarily unavailable. Please try again later.');
  });

  it('handleError should attach status, code, fieldErrors, and rawError onto thrown Error', async () => {
    const errorBody: ApiErrorResponse = {
      status: 400,
      code: 'BUS_TRIP_PRICE_REQUIRED',
      message: 'Price must be greater than zero',
      errors: [{ field: 'price', message: 'Price must be greater than zero' }],
    };
    const httpErr = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      error: errorBody,
    });

    try {
      await firstValueFrom(handleError(httpErr));
      expect.fail('handleError should have thrown');
    } catch (err: any) {
      expect(err.message).toBe('Price must be greater than zero');
      expect(err.status).toBe(400);
      expect(err.code).toBe('BUS_TRIP_PRICE_REQUIRED');
      expect(err.fieldErrors).toEqual([{ field: 'price', message: 'Price must be greater than zero' }]);
      expect(err.rawError).toBe(httpErr);
    }
  });
});
