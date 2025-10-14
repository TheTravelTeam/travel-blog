/// <reference types="jasmine" />

import { HttpHeaders, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let next: jasmine.Spy;

  beforeEach(() => {
    next = jasmine.createSpy('next').and.callFake((request: HttpRequest<unknown>) => of(request));
  });

  it('should delete Authorization header and disable credentials for Cloudinary calls', () => {
    const initialRequest = new HttpRequest('POST', 'https://api.cloudinary.com/v1_1/demo/upload', null, {
      headers: new HttpHeaders({ Authorization: 'Bearer custom-token' }),
      withCredentials: true,
    });

    TestBed.runInInjectionContext(() => {
      authInterceptor(initialRequest, next).subscribe();
    });

    const forwardedRequest = next.calls.mostRecent().args[0] as HttpRequest<unknown>;

    expect(forwardedRequest.headers.has('Authorization')).toBeFalse();
    expect(forwardedRequest.withCredentials).toBeFalse();
  });

  it('should enable credentials for application API calls', () => {
    const request = new HttpRequest('GET', '/api/protected');

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, next).subscribe();
    });

    const forwardedRequest = next.calls.mostRecent().args[0] as HttpRequest<unknown>;

    expect(forwardedRequest.withCredentials).toBeTrue();
  });

  it('should keep request untouched for external calls', () => {
    const request = new HttpRequest('GET', 'https://nominatim.openstreetmap.org/reverse');

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, next).subscribe();
    });

    const forwardedRequest = next.calls.mostRecent().args[0] as HttpRequest<unknown>;

    expect(forwardedRequest).toBe(request);
  });
});
