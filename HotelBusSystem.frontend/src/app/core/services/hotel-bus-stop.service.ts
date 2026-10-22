import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { PageHotelBusStopDTO, HotelBusStopListParams } from '../models/Pagination/hotelBusStopPage.model';
import { handleError } from '../../../utils/ErrorHandling';



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
      catchError(handleError)
    )
  }

}
