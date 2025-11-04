import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReverseGeocodingResult {
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
  continent: string | null;
}

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly apiUrl = this.resolveApiUrl();

  constructor(private readonly http: HttpClient) {}

  reverseGeocode(lat: number, lng: number): Observable<ReverseGeocodingResult> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lng.toString());

    return this.http.get<ReverseGeocodingResult>(this.apiUrl, { params }).pipe(
      map((result) => ({
        latitude: lat,
        longitude: lng,
        city: result?.city ?? null,
        country: result?.country ?? null,
        continent: result?.continent ?? null,
      }))
    );
  }

  private resolveApiUrl(): string {
    const configuredUrl = (environment.nominatimBaseUrl || '').trim();
    if (configuredUrl) {
      return configuredUrl;
    }
    const baseApi = environment.apiUrl.replace(/\/$/, '');
    return `${baseApi}/geocoding/reverse`;
  }
}
