/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { StepService } from './step.service';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CreateStepDto } from '@dto/create-step.dto';
import { Step } from '@model/step.model';
import { environment } from '../../../environments/environment';

describe('StepService', () => {
  let service: StepService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // ...autres providers
      ],
    });
    service = TestBed.inject(StepService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should POST a step and return the created Step', () => {
    const payload: CreateStepDto = {
      title: 'Nouvelle étape',
      description: 'Description',
      latitude: 1,
      longitude: 2,
      travelDiaryId: 5,
      themeIds: [4, 4, 12],
    };

    let response: Step | undefined;

    service.addStepToTravel(payload.travelDiaryId, payload).subscribe((step) => {
      response = step;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/steps`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      ...payload,
      themeIds: [4, 12],
    });

    const mockStep: Step = {
      id: 42,
      title: payload.title,
      description: payload.description ?? '',
      latitude: payload.latitude,
      longitude: payload.longitude,
      media: [],
      country: 'France',
      city: 'Paris',
      continent: 'Europe',
      startDate: new Date('2024-07-14'),
      isEditing: false,
      comments: [],
      likes: 0,
      likesCount: 0,
      themeIds: [4, 12],
      themes: [],
    };

    req.flush(mockStep);

    expect(response).toEqual(mockStep);
  });

  it('should PUT a step update and return the updated Step', () => {
    const payload: CreateStepDto = {
      title: 'Titre modifié',
      description: 'Desc modifiée',
      latitude: 5,
      longitude: 6,
      travelDiaryId: 9,
      themeIds: [Number.NaN, 7],
    };

    let response: Step | undefined;

    service.updateStep(42, payload).subscribe((step) => {
      response = step;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/steps/42`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      ...payload,
      themeIds: [7],
    });

    const mockStep: Step = {
      id: 42,
      title: payload.title,
      description: payload.description ?? '',
      latitude: payload.latitude,
      longitude: payload.longitude,
      media: [],
      country: 'France',
      city: 'Paris',
      continent: 'Europe',
      startDate: null,
      endDate: null,
      status: 'IN_PROGRESS',
      isEditing: false,
      comments: [],
      likes: 10,
      likesCount: 10,
      themeIds: [7],
      themes: [],
    };

    req.flush(mockStep);

    expect(response).toEqual(mockStep);
  });

  it('should PATCH step like increment and normalise the response', () => {
    let response: Step | undefined;

    service.updateStepLikes(42, true).subscribe((step) => {
      response = step;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/steps/42/likes`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ increment: true, delta: 1 });
    expect(req.request.withCredentials).toBe(environment.useCredentials);

    const mockBackendStep = {
      id: 42,
      title: 'Titre modifié',
      description: 'Desc modifiée',
      latitude: 5,
      longitude: 6,
      media: [],
      country: 'France',
      city: 'Paris',
      continent: 'Europe',
      startDate: null,
      isEditing: false,
      comments: [],
      likesCount: 11,
      themeIds: [],
      themes: [],
    } satisfies Partial<Step> & { likesCount: number };

    req.flush(mockBackendStep);

    expect(response).toEqual({ ...mockBackendStep, likes: 11, likesCount: 11 });
  });

  it('should PATCH step like decrement and normalise the response', () => {
    let response: Step | undefined;

    service.updateStepLikes(42, false).subscribe((step) => {
      response = step;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/steps/42/likes`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ increment: false, delta: -1 });
    expect(req.request.withCredentials).toBe(environment.useCredentials);

    const mockBackendStep = {
      id: 42,
      title: 'Titre modifié',
      description: 'Desc modifiée',
      latitude: 5,
      longitude: 6,
      media: [],
      country: 'France',
      city: 'Paris',
      continent: 'Europe',
      startDate: null,
      isEditing: false,
      comments: [],
      likesCount: 4,
      themeIds: [],
      themes: [],
    } satisfies Partial<Step> & { likesCount: number };

    req.flush(mockBackendStep);

    expect(response).toEqual({ ...mockBackendStep, likes: 4, likesCount: 4 });
  });

  it('should coerce string like counters returned by the backend', () => {
    let response: Step | undefined;

    service.updateStepLikes(9, true).subscribe((step) => {
      response = step;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/steps/9/likes`);
    req.flush({
      id: 9,
      likesCount: '3',
    } as unknown as Step);

    expect(response?.likes).toBe(3);
    expect(response?.likesCount).toBe(3);
  });

  it('should DELETE a step and return void', () => {
    let completed = false;

    service.deleteStep(7).subscribe(() => {
      completed = true;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/steps/7`);
    expect(req.request.method).toBe('DELETE');

    req.flush('', { status: 200, statusText: 'OK' });

    expect(completed).toBeTrue();
  });

  afterEach(() => {
    httpMock.verify();
  });
});
