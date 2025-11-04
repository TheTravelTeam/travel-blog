import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateStepDto } from '@dto/create-step.dto';
import { TravelDiary } from '@model/travel-diary.model';
import { CreateDiaryDto } from '@dto/create-diary.dto';
import { environment } from '../../../environments/environment';
import { Step } from '@model/step.model';

@Injectable({ providedIn: 'root' })
export class StepService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieves a diary by id and returns the full structure including steps.
   * @param travelId Identifier of the travel diary to fetch.
   */
  getDiaryWithSteps(travelId: number): Observable<TravelDiary> {
    return this.http.get<TravelDiary>(`${this.baseUrl}/travel-diaries/${travelId}`);
  }

  /**
   * Lists every diary owned by the provided user.
   * @param userId Target user identifier.
   */
  getDiaryListByUser(userId: number): Observable<TravelDiary[]> {
    return this.http.get<TravelDiary[]>(`${this.baseUrl}/travel-diaries/users/${userId}`);
  }

  /**
   * Creates a new step for the given travel diary.
   * @param _travelId Path parameter kept for compatibility (diary id).
   * @param newStep Payload describing the step to create.
   */
  addStepToTravel(_travelId: number, newStep: CreateStepDto): Observable<Step> {
    return this.http.post<Step>(`${this.baseUrl}/steps`, this.cleanStepPayload(newStep));
  }

  /**
   * Updates an existing step with the provided payload.
   * @param stepId Identifier of the step to update.
   * @param payload New values to persist.
   */
  updateStep(stepId: number, payload: CreateStepDto): Observable<Step> {
    return this.http.put<Step>(`${this.baseUrl}/steps/${stepId}`, this.cleanStepPayload(payload));
  }

  /**
   * Toggles the like counter for the targeted step using the backend contract.
   * @param stepId Identifier of the step to update.
   * @param increment True to like, false to unlike the step.
   */
  updateStepLikes(stepId: number, increment: boolean): Observable<Step> {
    return this.http.patch<Step>(
      `${this.baseUrl}/steps/${stepId}/likes`,
      { increment },
      {
        withCredentials: environment.useCredentials,
      }
    );
  }

  /**
   * Deletes the step identified by the provided id.
   * @param stepId Identifier of the step to remove.
   */
  deleteStep(stepId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/steps/${stepId}`);
  }

  /** Fetches every diary available on the public endpoint. */
  getAllDiaries(): Observable<TravelDiary[]> {
    return this.http.get<TravelDiary[]>(`${this.baseUrl}/travel-diaries`);
  }

  /**
   * Creates a new diary with the provided payload.
   * @param newDiary Payload to persist server-side.
   */
  addDiary(newDiary: CreateDiaryDto): Observable<TravelDiary> {
    return this.http.post<TravelDiary>(`${this.baseUrl}/travel-diaries`, newDiary);
  }

  /**
   * Updates the diary with the given identifier.
   * @param diaryId Target diary identifier.
   * @param payload Partial payload describing fields to override.
   */
  updateDiary(diaryId: number, payload: Partial<CreateDiaryDto>): Observable<TravelDiary> {
    return this.http.put<TravelDiary>(`${this.baseUrl}/travel-diaries/${diaryId}`, payload);
  }

  /**
   * Deletes a diary and normalises the void response.
   * @param diaryId Identifier of the diary to delete.
   */
  deleteDiary(diaryId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/travel-diaries/${diaryId}`);
  }

  /**
   * Deduplicates theme ids and strips null/undefined values to satisfy backend validation.
   */
  private cleanStepPayload(payload: CreateStepDto): CreateStepDto {
    const themeIds = Array.isArray(payload.themeIds)
      ? Array.from(
          new Set(
            payload.themeIds.filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0)
          )
        )
      : [];

    return {
      ...payload,
      themeIds,
    };
  }
}
