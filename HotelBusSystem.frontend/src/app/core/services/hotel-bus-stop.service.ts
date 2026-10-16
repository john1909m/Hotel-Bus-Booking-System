import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { PageHotelBusStopDTO } from '../models/Pagination/hotelBusStopPage.model';

export interface HotelBusStopListParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
  q?: string;
  hotelId?: string;
  busStopId?: string;
}

@Injectable({
  providedIn: 'root',
})

export class HotelBusStopService {
  private readonly apiUrl = `${environment.apiBaseUrl}/hotel-bus-stops`;
  private readonly http = inject(HttpClient);

  //GET /hotel-bus-stops
  getHotelBusStops(params: HotelBusStopListParams = {}): Observable<PageHotelBusStopDTO>{
    let httpParams = new HttpParams();
        if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.sortDirection) httpParams = httpParams.set('sortDirection', params.sortDirection);
    if (params.hotelId !== undefined) httpParams = httpParams.set('hotelId', params.hotelId);
    if (params.busStopId !== undefined) httpParams = httpParams.set('busStopId', params.busStopId);

    return this.http.get<PageHotelBusStopDTO>(this.apiUrl, { params: httpParams }).pipe(
      catchError(this.handleError)
    )
  }
    private handleError(error: HttpErrorResponse) {
    let message = 'Something went wrong';

    if (error.error instanceof ErrorEvent) {
      message = `Client Error: ${error.error.message}`;
    } else {
      message = `Server Error [${error.status}]: ${error.message}`;
    }

    console.error(message);
    return throwError(() => new Error(message));
  }
}
