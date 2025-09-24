import { HttpHeaders, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '@service/auth.service';

describe('authInterceptor', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let next: jasmine.Spy;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getToken']);

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authService }],
    });

    next = jasmine.createSpy('next').and.callFake((request: HttpRequest<unknown>) => of(request));
  });

  it('should delete Authorization header and disable credentials for Cloudinary calls', () => {
    const initialRequest = new HttpRequest('POST', 'https://api.cloudinary.com/v1_1/demo/upload', null, {
      headers: new HttpHeaders({ Authorization: 'Bearer custom-token' }),
      withCredentials: true,
    });

    authService.getToken.and.returnValue('jwt');

    TestBed.runInInjectionContext(() => {
      authInterceptor(initialRequest, next).subscribe();
    });

    const forwardedRequest = next.calls.mostRecent().args[0] as HttpRequest<unknown>;

    expect(forwardedRequest.headers.has('Authorization')).toBeFalse();
    expect(forwardedRequest.withCredentials).toBeFalse();
  });

  it('should attach Authorization header when token exists for non Cloudinary requests', () => {
    const request = new HttpRequest('GET', '/api/protected');
    authService.getToken.and.returnValue('jwt-token');

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, next).subscribe();
    });

    const forwardedRequest = next.calls.mostRecent().args[0] as HttpRequest<unknown>;

    expect(forwardedRequest.headers.get('Authorization')).toBe('Bearer jwt-token');
  });
});
