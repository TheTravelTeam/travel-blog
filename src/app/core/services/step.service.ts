import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CreateStepDto } from '@dto/create-step.dto';
import { TravelDiary } from '@model/travel-diary.model';
import { CreateDiaryDto } from '@dto/create-diary.dto';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StepService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDiaryWithSteps(travelId: number): Observable<TravelDiary> {
    return this.http.get<TravelDiary>(`${this.apiUrl}/${travelId}`).pipe(
      map((travels) => {
        return travels;
      })
    );
  }

  getDiaryListByUser(userId: number): Observable<TravelDiary[]> {
    return this.http.get<TravelDiary[]>(`${this.apiUrl}/users/${userId}`).pipe(
      map((travels) => {
        return travels;
      })
    );
  }

  addStepToTravel(travelId: number, newStep: CreateStepDto): Observable<TravelDiary> {
    return this.http.post<TravelDiary>(`${this.baseUrl}/travel-diaries/${travelId}/steps`, newStep);
  }

  getAllDiaries(): Observable<TravelDiary[]> {
    return this.http.get<TravelDiary[]>(`${this.baseUrl}/travel-diaries`);
  }

  addDiary(newDiary: CreateDiaryDto): Observable<TravelDiary> {
    return this.http.post<TravelDiary>(`${this.baseUrl}/travel-diaries`, newDiary);
  }
}
