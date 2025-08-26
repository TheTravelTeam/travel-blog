import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CreateStepDto } from '@dto/create-step.dto';
import { TravelDiary } from '@model/travel-diary.model';
import { CreateDiaryDto } from '@dto/create-diary.dto';

@Injectable({ providedIn: 'root' })
export class StepService {
  private apiUrl = 'http://localhost:8080/api/travels-diaries';

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
    return this.http.post<TravelDiary>(
      `http://localhost:8080/api/travels-diaries/${travelId}/steps`,
      newStep
    );
  }

  getAllDiaries(): Observable<TravelDiary[]> {
    return this.http.get<TravelDiary[]>(this.apiUrl);
  }

  addDiary(newDiary: CreateDiaryDto): Observable<TravelDiary> {
    return this.http.post<TravelDiary>('http://localhost:8080/api/travels-diaries', newDiary);
  }
}
