import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CreateStepDto } from '@dto/create-step.dto';
import { TravelDiary } from '@model/travel-diary.model';
import { CreateDiaryDto } from '@dto/create-diary.dto';
import { environment } from '../../../environments/environment';
import { Step } from '@model/step.model';
import { normalizeThemeIds } from '@utils/theme-selection.util';

@Injectable({ providedIn: 'root' })
export class StepService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Retrieves a diary by id and returns the full structure including steps.
   * @param travelId Identifier of the travel diary to fetch.
   */
  getDiaryWithSteps(travelId: number): Observable<TravelDiary> {
    return this.http.get<TravelDiary>(`${this.baseUrl}/travel-diaries/${travelId}`).pipe(
      map((travels) => {
        return travels;
      })
    );
  }

  /**
   * Lists every diary owned by the provided user.
   * @param userId Target user identifier.
   */
  getDiaryListByUser(userId: number): Observable<TravelDiary[]> {
    return this.http.get<TravelDiary[]>(`${this.baseUrl}/users/${userId}`).pipe(
      map((travels) => {
        return travels;
      })
    );
  }

  /**
   * Creates a new step for the given travel diary.
   * @param _travelId Path parameter kept for compatibility (diary id).
   * @param newStep Payload describing the step to create.
   */
  addStepToTravel(_travelId: number, newStep: CreateStepDto): Observable<Step> {
    // Backend expects POST /steps with travelDiaryId in body and returns the created Step
    return this.http.post<Step>(`${this.baseUrl}/steps`, this.normalisePayload(newStep));
  }

  /**
   * Updates an existing step with the provided payload.
   * @param stepId Identifier of the step to update.
   * @param payload New values to persist.
   */
  updateStep(stepId: number, payload: CreateStepDto): Observable<Step> {
    return this.http.put<Step>(`${this.baseUrl}/steps/${stepId}`, this.normalisePayload(payload));
  }

  /**
   * Deletes the step identified by the provided id.
   * @param stepId Identifier of the step to remove.
   */
  deleteStep(stepId: number): Observable<void> {
    return this.http
      .delete(`${this.baseUrl}/steps/${stepId}`, { responseType: 'text' })
      .pipe(map(() => void 0));
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
    return this.http
      .delete(`${this.baseUrl}/travel-diaries/${diaryId}`, { responseType: 'text' })
      .pipe(map(() => void 0));
  }

  /**
   * Ensures the outgoing step payload respects the backend constraints.
   * @param payload Raw payload coming from the UI.
   */
  private normalisePayload(payload: CreateStepDto): CreateStepDto {
    return {
      ...payload,
      themeIds: normalizeThemeIds(null, payload.themeIds),
    };
  }
}
