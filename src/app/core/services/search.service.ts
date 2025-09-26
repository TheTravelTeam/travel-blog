import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import {
  SearchResultDto,
  SearchResultDiaryDto,
  SearchResultStepDto,
} from '@dto/search-result.dto';
import { SearchResultItem } from '@model/search-result.model';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  search(query: string): Observable<SearchResultItem[]> {
    if (!query.trim()) {
      return of([]);
    }

    const params = new HttpParams().set('query', query.trim());

    return this.http
      .get<SearchResultDto>(`${this.apiUrl}/search`, {
        params,
        withCredentials: environment.useCredentials,
      })
      .pipe(
        map((payload) => this.mapResults(payload)),
        catchError((error) => {
          console.error('Search request failed', error);
          return of([]);
        })
      );
  }

  private mapResults(payload: SearchResultDto | null | undefined): SearchResultItem[] {
    if (!payload) {
      return [];
    }

    const diaries = (payload.diaries ?? []).map((item) => this.mapDiary(item));
    const steps = (payload.steps ?? []).map((item) => this.mapStep(item));

    return [...diaries, ...steps];
  }

  private mapDiary(dto: SearchResultDiaryDto): SearchResultItem {
    return {
      id: dto.id,
      type: 'diary',
      label: dto.title?.trim() || 'Carnet sans titre',
      description: dto.description ?? null,
      thumbnailUrl: dto.coverUrl ?? null,
    };
  }

  private mapStep(dto: SearchResultStepDto): SearchResultItem {
    return {
      id: dto.id,
      type: 'step',
      label: dto.title?.trim() || 'Étape sans titre',
      description: dto.excerpt ?? null,
      diaryId: dto.diaryId,
      diaryTitle: dto.diaryTitle ?? null,
    };
  }
}
