import { HttpErrorResponse } from "@angular/common/http";
import { Observable, throwError } from "rxjs";

/**
 * Standard backend field-level validation error structure.
 */
export interface ApiFieldError {
  field: string;
  message: string;
}

/**
 * Standard post-pull backend error response contract (ErrorResponse.java).
 */
export interface ApiErrorResponse {
  timestamp?: string;
  status?: number;
  code?: string;
  message?: string;
  path?: string;
  errors?: ApiFieldError[];
}

/**
 * Known backend error keys and their customer-friendly messages.
 */
const ERROR_CODE_MAP: Record<string, string> = {
  'error.seat_already_booked': 'This seat is already booked for the selected trip.',
  'error.seat_already_booked_number': 'One or more of the selected seats are already booked.',
  'error.trip_departed': 'This bus trip has already departed.',
  'error.trip_not_bookable': 'This bus trip is no longer available for booking.',
  'error.seat_does_not_belong_to_bus': 'The selected seat does not belong to this bus.',
  'error.invalid_seat': 'The seat selection is invalid.',
  'error.bus_trip_not_found': 'The requested bus trip could not be found.',
  'error.bus_seat_not_found': 'The requested bus seat could not be found.',
  'error.user_not_found': 'User account could not be found.',
  'error.access_denied': 'Please log in to continue with your reservation.',
  'error.booking.invalid_status_transition': 'The requested booking status change is not permitted.',
};

/**
 * Extracts a customer-friendly error message from an error response,
 * respecting structured field-level errors and domain error codes from the backend.
 */
export function extractErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred. Please try again.'): string {
  if (!error) return fallbackMessage;

  // If already an Error object with custom friendly message
  if (error instanceof Error && error.message && !error.message.startsWith('Server Error [') && !error.message.startsWith('Http failure response')) {
    return translateErrorMessage(error.message);
  }

  // If it's an HttpErrorResponse or wrapped error
  const rawError = (error as any)?.rawError || error;
  if (rawError instanceof HttpErrorResponse || (rawError && typeof rawError === 'object' && 'status' in rawError)) {
    const httpErr = rawError as HttpErrorResponse;

    // Check for structured field validation errors first
    const fieldMsg = formatFieldErrors(httpErr.error);

    // 401 / 403 Authentication
    if (httpErr.status === 401 || httpErr.status === 403) {
      const msg = extractRawMessage(httpErr.error);
      if (msg) return translateErrorMessage(msg);
      return httpErr.status === 401
        ? 'Authentication required. Please log in to complete your reservation.'
        : 'Access denied. You do not have permission for this action.';
    }

    // 409 Conflict
    if (httpErr.status === 409) {
      const msg = extractRawMessage(httpErr.error);
      if (msg) return translateErrorMessage(msg);
      return 'The selected resource is no longer available or conflicts with an existing reservation.';
    }

    // 404 Not Found
    if (httpErr.status === 404) {
      const msg = extractRawMessage(httpErr.error);
      if (msg) return translateErrorMessage(msg);
      return 'The requested resource was not found.';
    }

    // 410 Gone (Draft Expired)
    if (httpErr.status === 410) {
      const msg = extractRawMessage(httpErr.error);
      if (msg) return translateErrorMessage(msg);
      return 'This booking draft has expired. Please create a new booking.';
    }

    // 429 Too Many Requests (Rate Limit)
    if (httpErr.status === 429) {
      const msg = extractRawMessage(httpErr.error);
      if (msg) return translateErrorMessage(msg);
      return 'Too many requests. Please wait a moment and try again.';
    }

    // 503 Service Unavailable
    if (httpErr.status === 503) {
      const msg = extractRawMessage(httpErr.error);
      if (msg) return translateErrorMessage(msg);
      return 'Service is temporarily unavailable. Please try again later.';
    }

    // 400 Bad Request
    if (httpErr.status === 400) {
      if (fieldMsg) return fieldMsg;
      const msg = extractRawMessage(httpErr.error);
      if (msg) return translateErrorMessage(msg);
      return 'Invalid reservation request. Please review your details and try again.';
    }

    // Other backend error body
    if (fieldMsg) return fieldMsg;
    const bodyMsg = extractRawMessage(httpErr.error);
    if (bodyMsg) {
      return translateErrorMessage(bodyMsg);
    }
  }

  if (typeof error === 'string') {
    return translateErrorMessage(error);
  }

  return fallbackMessage;
}

function formatFieldErrors(errorBody: unknown): string | null {
  if (!errorBody || typeof errorBody !== 'object') return null;
  const errObj = errorBody as Record<string, unknown>;

  // Check array of { field, message }
  if (Array.isArray(errObj['errors']) && errObj['errors'].length > 0) {
    const fieldDetails = (errObj['errors'] as ApiFieldError[])
      .map(e => e.message || (e.field ? `${e.field} is invalid` : ''))
      .filter(Boolean);

    if (fieldDetails.length > 0) {
      // Deduplicate messages
      const unique = Array.from(new Set(fieldDetails));
      return unique.join('; ');
    }
  }

  return null;
}

function extractRawMessage(errorBody: unknown): string | null {
  if (!errorBody) return null;
  if (typeof errorBody === 'string' && errorBody.trim()) {
    return errorBody.trim();
  }
  if (typeof errorBody === 'object' && errorBody !== null) {
    const errObj = errorBody as Record<string, unknown>;
    if (typeof errObj['message'] === 'string' && errObj['message'].trim()) {
      return errObj['message'].trim();
    }
    if (typeof errObj['error'] === 'string' && errObj['error'].trim()) {
      return errObj['error'].trim();
    }
  }
  return null;
}

function translateErrorMessage(msg: string): string {
  // Check exact code match
  if (ERROR_CODE_MAP[msg]) {
    return ERROR_CODE_MAP[msg];
  }

  // Handle format strings like "Seat 12 is already booked for the selected trip"
  if (msg.toLowerCase().includes('already booked')) {
    return msg; // Already human readable from backend bundleMessageService
  }
  if (msg.toLowerCase().includes('departed')) {
    return 'This bus trip has already departed.';
  }
  if (msg.toLowerCase().includes('not bookable') || msg.toLowerCase().includes('unavailable')) {
    return msg;
  }

  return msg;
}

export function handleError(error: HttpErrorResponse): Observable<never> {
  const message = extractErrorMessage(error);

  console.error('[API Error]:', message, error);
  const err = new Error(message);
  (err as any).status = error.status;
  (err as any).error = error.error;
  (err as any).rawError = error;
  (err as any).code = (error.error as any)?.code;
  (err as any).fieldErrors = (error.error as any)?.errors;
  return throwError(() => err);
}
