import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ThemeDto } from '@dto/theme.dto';
import { Theme } from '@model/theme.model';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Retrieves themes and retries once if the backend temporarily returns 404.
   */
  getThemes(): Observable<Theme[]> {
    return this.http.get<ThemeDto[]>(`${this.apiUrl}/themes`).pipe(
      map((dtos) => dtos.map((theme) => this.mapTheme(theme))),
      catchError((error) => {
        if (error?.status === 404) {
          return this.http
            .get<ThemeDto[]>(`${this.apiUrl}/themes`)
            .pipe(map((dtos) => dtos.map((theme) => this.mapTheme(theme))));
        }
        return throwError(() => error);
      })
    );
  }

  /** Coerces a raw DTO into the strongly typed Theme model. */
  private mapTheme(dto: ThemeDto): Theme {
    return {
      id: Number(dto.id),
      name: dto.name,
      updatedAt: dto.updatedAt,
    };
  }
}
