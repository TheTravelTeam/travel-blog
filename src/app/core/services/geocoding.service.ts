import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, shareReplay } from 'rxjs';
import { NominatimResponse } from '@model/nominatim-reponse.model';
import { COUNTRY_CONTINENT_MAP } from '@model/utils/country-continent.map';

/** Minimal subset of Nominatim data used by the application. */
export interface ReverseGeocodingResult {
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
  continent: string | null;
}

@Injectable({ providedIn: 'root' })
/** Lightweight wrapper around Nominatim reverse geocoding API with in-memory caching. */
export class GeocodingService {
  private readonly apiUrl = 'https://nominatim.openstreetmap.org/reverse';
  private readonly cache = new Map<string, ReverseGeocodingResult>();

  constructor(private readonly http: HttpClient) {}

  /**
   * Resolve a pair of coordinates into human-readable city/country information.
   * Results are cached in-memory to avoid hitting rate limits when the user reopens the same location.
   */
  reverseGeocode(lat: number, lng: number): Observable<ReverseGeocodingResult> {
    const key = this.buildCacheKey(lat, lng);
    const cached = this.cache.get(key);

    if (cached) {
      return of(cached);
    }

    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: lat.toString(),
      lon: lng.toString(),
      addressdetails: '1',
      zoom: '10',
    });

    return this.http
      .get<NominatimResponse>(`${this.apiUrl}?${params.toString()}`, {
        headers: {
          'Accept-Language': 'fr',
        },
      })
      .pipe(
        map((response) => this.mapToResult(lat, lng, response)),
        map((result) => {
          this.cache.set(key, result);
          return result;
        }),
        shareReplay({ bufferSize: 1, refCount: true })
      );
  }

  private buildCacheKey(lat: number, lng: number): string {
    return `${lat.toFixed(6)}_${lng.toFixed(6)}`;
  }

  /** Map the raw Nominatim payload to the trimmed structure used by the UI. */
  private mapToResult(lat: number, lng: number, response: NominatimResponse): ReverseGeocodingResult {
    const address = response.address ?? {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.city_district ||
      address.county ||
      null;

    const country = address.country || null;
    const continent = this.resolveContinent(address);

    return {
      latitude: lat,
      longitude: lng,
      city,
      country,
      continent,
    };
  }

  private resolveContinent(address: NominatimResponse['address']): string | null {
    if (!address) {
      return null;
    }

    if (address.continent) {
      return address.continent;
    }

    const code = address.country_code ? address.country_code.toUpperCase() : null;
    if (!code) {
      return null;
    }

    return COUNTRY_CONTINENT_MAP[code] ?? null;
  }
}
