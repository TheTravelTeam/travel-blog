import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UpsertCommentDto } from '@dto/upsert-comment.dto';
import { Comment } from '@model/comment';

/**
 * Encapsulates API interactions for travel diary comments.
 */
@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Persists a new comment on the backend for the provided step.
   * @param stepId Step identifier the comment belongs to.
   * @param content Raw content typed by the user.
   */
  create(stepId: number, content: string): Observable<Comment> {
    const payload: UpsertCommentDto = { stepId, content };
    return this.http.post<Comment>(`${this.apiUrl}/comments`, payload, {
      withCredentials: environment.useCredentials,
    });
  }

  /**
   * Retrieves every comment associated to a given step.
   * @param stepId Step identifier to filter by.
   */
  listByStep(stepId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/comments`, {
      params: { stepId: String(stepId) },
      withCredentials: environment.useCredentials,
    });
  }

  /**
   * Deletes an existing comment by its identifier.
   * @param commentId Identifier of the comment to remove.
   */
  delete(commentId: number): Observable<void> {
    return this.http
      .delete(`${this.apiUrl}/comments/${commentId}`, {
        responseType: 'text',
        withCredentials: environment.useCredentials,
      })
      .pipe(map(() => void 0));
  }

  /**
   * Updates the content of an existing comment.
   * @param commentId Identifier of the comment to edit.
   * @param stepId Identifier of the step containing the comment
   * @param content New content to persist.
   */
  update(commentId: number, stepId: number, content: string): Observable<Comment> {
    const payload: UpsertCommentDto = {
      stepId,
      content,
    };

    return this.http.put<Comment>(`${this.apiUrl}/comments/${commentId}`, payload, {
      withCredentials: environment.useCredentials,
    });
  }
}
