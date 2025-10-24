import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Article } from '@model/article.model';
import { ArticleDto, UpsertArticleDto } from '@dto/article.dto';
import { Media } from '@model/media.model';

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
   * Retrieves a single article by its identifier.
   */
  getArticleById(articleId: number): Observable<Article> {
    return this.http
      .get<ArticleDto>(`${this.apiUrl}/articles/${articleId}`)
      .pipe(map((dto) => this.mapArticle(dto)));
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
   * (string trimming plus sane defaults on optional fields).
   */
  private mapArticle(dto: ArticleDto): Article {
    const medias = this.mapMedias(dto.medias);

    const coverUrl = dto.coverUrl?.trim() || null;
    const thumbnailUrl = dto.thumbnailUrl?.trim() || null;
    const author = dto.pseudo?.trim() || '';
    const category = dto.category?.trim() || undefined;

    return {
      id: dto.id,
      title: dto.title,
      content: dto.content,
      slug: dto.slug,
      updatedAt: dto.updatedAt,
      author,
      category,
      userId: dto.userId ?? undefined,
      coverUrl,
      thumbnailUrl,
      medias,
    };
  }

  private mapMedias(medias?: ArticleDto['medias']): Media[] | undefined {
    if (!Array.isArray(medias) || !medias.length) {
      return undefined;
    }

    const normalized: Media[] = [];

    for (const media of medias) {
      if (!media) {
        continue;
      }

      const id = Number(media.id);
      if (Number.isNaN(id)) {
        continue;
      }

      const fileUrl = media.fileUrl?.trim();
      if (!fileUrl) {
        continue;
      }

      normalized.push({
        id,
        fileUrl,
        mediaType: media.mediaType ?? 'PHOTO',
        status: media.status ?? 'PUBLISHED',
        createdAt: media.createdAt ?? '',
        updatedAt: media.updatedAt ?? '',
        publicId: media.publicId ?? null,
        articleId: media.articleId ?? null,
        travelDiaryId: null,
        stepId: null,
      });
    }

    return normalized.length ? normalized : undefined;
  }
}
