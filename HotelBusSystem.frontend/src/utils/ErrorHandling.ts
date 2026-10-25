import { HttpErrorResponse } from "@angular/common/http";
import { Observable, throwError } from "rxjs";

export function handleError(error: HttpErrorResponse) : Observable<never> {
    let message = 'Something went wrong';

    if (error.error instanceof ErrorEvent) {
      message = `Client Error: ${error.error.message}`;
    } else if (typeof error.error === 'string' && error.error.trim()) {
      message = error.error;
    } else if (error.error && typeof error.error === 'object' && error.error.message) {
      message = error.error.message;
    } else {
      message = `Server Error [${error.status}]: ${error.statusText || error.message}`;
    }

    console.error(message);
    const err = new Error(message);
    (err as any).status = error.status;
    (err as any).error = error.error;
    (err as any).rawError = error;
    return throwError(() => err);
}