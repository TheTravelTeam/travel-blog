import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateMediaDto } from '@dto/create-media.dto';
import { UpdateMediaDto } from '@dto/update-media.dto';
import { Media } from '@model/media.model';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  createMedia(payload: CreateMediaDto): Observable<Media> {
    return this.http.post<Media>(`${this.baseUrl}/medias`, payload);
  }

  createStepMedia(payload: CreateMediaDto): Observable<Media> {
    return this.createMedia(payload);
  }

  createDiaryMedia(payload: CreateMediaDto): Observable<Media> {
    return this.createMedia(payload);
  }

  updateMedia(mediaId: number, payload: UpdateMediaDto): Observable<Media> {
    return this.http.put<Media>(`${this.baseUrl}/medias/${mediaId}`, payload);
  }

  deleteMedia(mediaId: number): Observable<void> {
    return this.http
      .delete(`${this.baseUrl}/medias/${mediaId}`, { responseType: 'text' })
      .pipe(map(() => void 0));
  }
}
