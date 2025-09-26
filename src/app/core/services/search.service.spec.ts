import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SearchService } from './search.service';
import { environment } from '../../../environments/environment';

describe('SearchService', () => {
  let service: SearchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SearchService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(SearchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should map diaries and steps search results', () => {
    service.search('island').subscribe((results) => {
      expect(results).toEqual([jasmine.objectContaining({ type: 'diary', id: 1 })]);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/search?query=island`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(environment.useCredentials);

    req.flush({
      diaries: [
        {
          id: 1,
          title: 'Islande',
          description: 'Road trip',
          coverUrl: 'https://example.com/island.jpg',
        },
      ],
    });
  });

  it('should return empty array on error', () => {
    let payload: any = 'not-called';
    service.search('error').subscribe((results) => {
      payload = results;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/search?query=error`);
    req.error(new ProgressEvent('Network error'));

    expect(payload).toEqual([]);
  });
});
