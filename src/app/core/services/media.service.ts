import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateMediaDto } from '@dto/create-media.dto';
import { Media } from '@model/media.model';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  createDiaryMedia(payload: CreateMediaDto): Observable<Media> {
    return this.http.post<Media>(`${this.baseUrl}/medias`, payload);
  }

  createStepMedia(payload: CreateMediaDto): Observable<Media> {
    return this.http.post<Media>(`${this.baseUrl}/medias`, payload);
  }
}
