import { TestBed } from '@angular/core/testing';
import { StepService } from './step.service';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CreateStepDto } from '@dto/create-step.dto';
import { Step } from '@model/step.model';

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
    };

    let response: Step | undefined;

    service.addStepToTravel(payload.travelDiaryId, payload).subscribe((step) => {
      response = step;
    });

    const req = httpMock.expectOne('http://localhost:8080/steps');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

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
    };

    let response: Step | undefined;

    service.updateStep(42, payload).subscribe((step) => {
      response = step;
    });

    const req = httpMock.expectOne('http://localhost:8080/steps/42');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);

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
    };

    req.flush(mockStep);

    expect(response).toEqual(mockStep);
  });

  it('should DELETE a step and return void', () => {
    let completed = false;

    service.deleteStep(7).subscribe(() => {
      completed = true;
    });

    const req = httpMock.expectOne('http://localhost:8080/steps/7');
    expect(req.request.method).toBe('DELETE');

    req.flush('', { status: 200, statusText: 'OK' });

    expect(completed).toBeTrue();
  });

  afterEach(() => {
    httpMock.verify();
  });
});
