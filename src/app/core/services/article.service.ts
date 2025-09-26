import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Article } from '@model/article.model';
import { ArticleDto, UpsertArticleDto } from '@dto/article.dto';
import { Theme } from '@model/theme.model';

@Injectable({ providedIn: 'root' })
export class ArticleService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Fetches the list of articles from the API and normalizes them for the UI layer.
   */
  getArticles(): Observable<Article[]> {
    return this.http
      .get<ArticleDto[]>(`${this.apiUrl}/articles`)
      .pipe(map((dtos) => dtos.map((dto) => this.mapArticle(dto))));
  }

  /**
   * Persists a new article then converts the DTO response into the domain model.
   */
  createArticle(payload: UpsertArticleDto): Observable<Article> {
    return this.http
      .post<ArticleDto>(`${this.apiUrl}/articles`, payload)
      .pipe(map((dto) => this.mapArticle(dto)));
  }

  /**
   * Updates an existing article identified by `articleId` and returns the normalized entity.
   */
  updateArticle(articleId: number, payload: UpsertArticleDto): Observable<Article> {
    return this.http
      .put<ArticleDto>(`${this.apiUrl}/articles/${articleId}`, payload)
      .pipe(map((dto) => this.mapArticle(dto)));
  }

  /** Deletes an article without expecting a payload. */
  deleteArticle(articleId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/articles/${articleId}`);
  }

  /**
   * Harmonizes the shape of an article to match the front-end expectations
   * (themes flattened, ids coerced to numbers, sane defaults on optional fields).
   */
  private mapArticle(dto: ArticleDto): Article {
    const rawThemes = this.normalizeThemes(dto);
    const fromThemesArray = rawThemes.length ? rawThemes[0] : null;
    const rawThemeId = dto.theme?.id ?? dto.themeId ?? fromThemesArray?.id ?? null;
    const themeId = rawThemeId != null ? Number(rawThemeId) : null;
    const safeThemeId = Number.isNaN(themeId) ? null : themeId;
    const themeName = dto.theme?.name ?? dto.themeName ?? fromThemesArray?.name ?? undefined;
    const themes = this.mapThemes(rawThemes);

    return {
      id: dto.id,
      title: dto.title,
      content: dto.content,
      slug: dto.slug,
      updatedAt: dto.updatedAt,
      author: dto.pseudo ?? '',
      category: themeName ?? dto.category ?? undefined,
      themes,
      themeId: safeThemeId ?? undefined,
      userId: dto.userId ?? undefined,
    };
  }

  /** Converts the list of themes coming from the API into a typed array. */
  private mapThemes(
    themes?: { id: number; name: string; updatedAt?: string }[] | null
  ): Theme[] | undefined {
    if (!Array.isArray(themes) || !themes.length) {
      return undefined;
    }

    return themes
      .map((theme) => {
        if (!theme) {
          return null;
        }

        const id = Number(theme.id);
        if (Number.isNaN(id)) {
          return null;
        }

        return {
          id,
          name: theme.name,
          updatedAt: theme.updatedAt ?? '',
        } satisfies Theme;
      })
      .filter((theme): theme is Theme => !!theme);
  }

  /** Groups theme information regardless of API shape (single object or array). */
  private normalizeThemes(dto: ArticleDto): { id: number; name: string; updatedAt?: string }[] {
    if (Array.isArray(dto.themes) && dto.themes.length) {
      return dto.themes;
    }

    if (dto.theme) {
      return [dto.theme];
    }

    return [];
  }
}
