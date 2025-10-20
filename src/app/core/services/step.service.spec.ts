/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { StepService } from './step.service';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Step } from '@model/step.model';
import { environment } from '../../../environments/environment';
import {
  addStepDuplicateThemesPayload,
  addStepForbiddenPayload,
  addStepValidationErrorPayload,
  createdStepResponse,
  updateStepForbiddenPayload,
  updateStepNotFoundPayload,
  updateStepWithInvalidThemesPayload,
  updatedStepResponse,
} from './step.service.mock';

describe('StepService', () => {
  let service: StepService;
  let httpMock: HttpTestingController;
  const baseUrl = environment.apiUrl;

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

  it('TC-STEP-SVC-01 addStepToTravel should deduplicate theme ids before POST', () => {
    const payload = {
      ...addStepDuplicateThemesPayload,
      themeIds: [...addStepDuplicateThemesPayload.themeIds],
    };

    let response: Step | undefined;

    service.addStepToTravel(payload.travelDiaryId, payload).subscribe((step) => {
      response = step;
    });

    const req = httpMock.expectOne(`${baseUrl}/steps`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      ...payload,
      themeIds: [4, 12],
    });

    const mockStep = {
      ...createdStepResponse,
      media: [...createdStepResponse.media],
      comments: createdStepResponse.comments ? [...createdStepResponse.comments] : [],
      themeIds: [...createdStepResponse.themeIds],
      themes: [...createdStepResponse.themes],
    };
    req.flush(mockStep);

    expect(response).toEqual(mockStep);
    expect(response?.likes).toBe(mockStep.likesCount);
  });

  it('TC-STEP-SVC-02 addStepToTravel should surface backend validation errors', () => {
    const payload = {
      ...addStepValidationErrorPayload,
      themeIds: [...addStepValidationErrorPayload.themeIds],
    };

    let capturedError: unknown;

    service.addStepToTravel(payload.travelDiaryId, payload).subscribe({
      next: fail,
      error: (error) => {
        capturedError = error;
      },
    });

    const req = httpMock.expectOne(`${baseUrl}/steps`);
    req.flush(
      { message: 'Payload invalide' },
      { status: 422, statusText: 'Unprocessable Entity' }
    );

    expect(capturedError).toEqual(jasmine.objectContaining({ status: 422 }));
    expect((capturedError as any).error).toEqual({ message: 'Payload invalide' });
  });

  it('TC-STEP-SVC-03 addStepToTravel should propagate ownership errors', () => {
    const payload = {
      ...addStepForbiddenPayload,
      themeIds: [...addStepForbiddenPayload.themeIds],
    };

    let capturedError: unknown;

    service.addStepToTravel(payload.travelDiaryId, payload).subscribe({
      next: fail,
      error: (error) => {
        capturedError = error;
      },
    });

    const req = httpMock.expectOne(`${baseUrl}/steps`);
    req.flush(
      { message: 'accès refusé' },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(capturedError).toEqual(jasmine.objectContaining({ status: 403 }));
    expect((capturedError as any).error).toEqual({ message: 'accès refusé' });
  });

  it('TC-STEP-SVC-04 updateStep should filter invalid theme ids before PUT', () => {
    const payload = {
      ...updateStepWithInvalidThemesPayload,
      themeIds: [...updateStepWithInvalidThemesPayload.themeIds],
    };

    let response: Step | undefined;

    service.updateStep(42, payload).subscribe((step) => {
      response = step;
    });

    const req = httpMock.expectOne(`${baseUrl}/steps/42`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      ...payload,
      themeIds: [7],
    });

    const mockStep = {
      ...updatedStepResponse,
      media: [...updatedStepResponse.media],
      comments: updatedStepResponse.comments ? [...updatedStepResponse.comments] : [],
      themeIds: [...updatedStepResponse.themeIds],
      themes: [...updatedStepResponse.themes],
    };

    req.flush(mockStep);

    expect(response).toEqual(mockStep);
  });

  it('TC-STEP-SVC-05 updateStep should propagate 404 errors when step is missing', () => {
    const payload = {
      ...updateStepNotFoundPayload,
      themeIds: [...updateStepNotFoundPayload.themeIds],
    };

    let capturedError: unknown;

    service.updateStep(999, payload).subscribe({
      next: fail,
      error: (error) => {
        capturedError = error;
      },
    });

    const req = httpMock.expectOne(`${baseUrl}/steps/999`);
    req.flush(
      { message: 'Step non trouvée' },
      { status: 404, statusText: 'Not Found' }
    );

    expect(capturedError).toEqual(jasmine.objectContaining({ status: 404 }));
    expect((capturedError as any).error).toEqual({ message: 'Step non trouvée' });
  });

  it('TC-STEP-SVC-06 updateStep should propagate ownership errors', () => {
    const payload = {
      ...updateStepForbiddenPayload,
      themeIds: [...updateStepForbiddenPayload.themeIds],
    };

    let capturedError: unknown;

    service.updateStep(7, payload).subscribe({
      next: fail,
      error: (error) => {
        capturedError = error;
      },
    });

    const req = httpMock.expectOne(`${baseUrl}/steps/7`);
    req.flush({ message: 'accès refusé' }, { status: 403, statusText: 'Forbidden' });

    expect(capturedError).toEqual(jasmine.objectContaining({ status: 403 }));
    expect((capturedError as any).error).toEqual({ message: 'accès refusé' });
  });

  it('should PATCH step like increment and normalise the response', () => {
    let response: Step | undefined;

    service.updateStepLikes(42, true).subscribe((step) => {
      response = step;
    });

    const req = httpMock.expectOne(`${baseUrl}/steps/42/likes`);
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

    const req = httpMock.expectOne(`${baseUrl}/steps/42/likes`);
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

    const req = httpMock.expectOne(`${baseUrl}/steps/9/likes`);
    req.flush({
      id: 9,
      likesCount: '3',
    } as unknown as Step);

    expect(response?.likes).toBe(3);
    expect(response?.likesCount).toBe(3);
  });

  it('TC-STEP-SVC-07 deleteStep should resolve void on success', () => {
    let completed = false;

    service.deleteStep(7).subscribe(() => {
      completed = true;
    });

    const req = httpMock.expectOne(`${baseUrl}/steps/7`);
    expect(req.request.method).toBe('DELETE');

    req.flush('', { status: 200, statusText: 'OK' });

    expect(completed).toBeTrue();
  });

  it('TC-STEP-SVC-08 deleteStep should propagate ownership errors', () => {
    let capturedError: unknown;

    service.deleteStep(42).subscribe({
      next: fail,
      error: (error) => {
        capturedError = error;
      },
    });

    const req = httpMock.expectOne(`${baseUrl}/steps/42`);
    req.flush('accès refusé', { status: 403, statusText: 'Forbidden' });

    expect(capturedError).toEqual(jasmine.objectContaining({ status: 403 }));
    expect((capturedError as any)?.error).toBe('accès refusé');
  });

  afterEach(() => {
    httpMock.verify();
  });
});
