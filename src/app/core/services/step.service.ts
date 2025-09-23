import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CreateStepDto } from '@dto/create-step.dto';
import { TravelDiary } from '@model/travel-diary.model';
import { CreateDiaryDto } from '@dto/create-diary.dto';
import { environment } from '../../../environments/environment';
import { Step } from '@model/step.model';

@Injectable({ providedIn: 'root' })
export class StepService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDiaryWithSteps(travelId: number): Observable<TravelDiary> {
    return this.http.get<TravelDiary>(`${this.baseUrl}/travel-diaries/${travelId}`).pipe(
      map((travels) => {
        return travels;
      })
    );
  }

  getDiaryListByUser(userId: number): Observable<TravelDiary[]> {
    return this.http.get<TravelDiary[]>(`${this.baseUrl}/users/${userId}`).pipe(
      map((travels) => {
        return travels;
      })
    );
  }

  addStepToTravel(_travelId: number, newStep: CreateStepDto): Observable<Step> {
    // Backend expects POST /steps with travelDiaryId in body and returns the created Step
    return this.http.post<Step>(`${this.baseUrl}/steps`, newStep);
  }

  /**
   * Persists modifications of an existing step. The backend expects the same payload
   * as creation, with the URL path carrying the step identifier.
   */
  updateStep(stepId: number, payload: CreateStepDto): Observable<Step> {
    return this.http.put<Step>(`${this.baseUrl}/steps/${stepId}`, payload);
  }

  /**
   * Removes an existing step and normalises the backend's textual response to void.
   */
  deleteStep(stepId: number): Observable<void> {
    return this.http
      .delete(`${this.baseUrl}/steps/${stepId}`, { responseType: 'text' })
      .pipe(map(() => void 0));
  }

  getAllDiaries(): Observable<TravelDiary[]> {
    return this.http.get<TravelDiary[]>(`${this.baseUrl}/travel-diaries`);
  }

  addDiary(newDiary: CreateDiaryDto): Observable<TravelDiary> {
    return this.http.post<TravelDiary>(`${this.baseUrl}/travel-diaries`, newDiary);
  }

  updateDiary(diaryId: number, payload: Partial<CreateDiaryDto>): Observable<TravelDiary> {
    return this.http.put<TravelDiary>(`${this.baseUrl}/travel-diaries/${diaryId}`, payload);
  }

  deleteDiary(diaryId: number): Observable<void> {
    return this.http
      .delete(`${this.baseUrl}/travel-diaries/${diaryId}`, { responseType: 'text' })
      .pipe(map(() => void 0));
  }
}
