/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { UserProfileDto } from '@dto/user-profile.dto';
import { signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

class AuthServiceStub {
  currentUser = signal<UserProfileDto | null>(null);

  loadCurrentUser(): Observable<UserProfileDto> {
    if (this.currentUser()) {
      return of(this.currentUser()!);
    } else {
      return throwError(() => new Error("L'utilisateur n'est pas authentifié"));
    }
  }

  saveCurrentUser(user: UserProfileDto | null) {
    this.currentUser.set(user);
  }
}

describe('UserService', () => {
  let userService: UserService;
  let httpMock: HttpTestingController;
  let authService: AuthServiceStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useClass: AuthServiceStub },
      ],
    });

    userService = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load the current user profile when authenticated', () => {
    const currentUser: UserProfileDto = {
      id: 42,
      pseudo: 'wanderer',
      firstName: 'Jane',
      lastName: 'Doe',
      roles: ['ROLE_admin', 'ROLE_user'],
      travelDiaries: [],
    };

    authService.saveCurrentUser(currentUser);

    let profile: UserProfileDto | undefined;
    userService.getCurrentUserProfile().subscribe((p) => (profile = p));

    const request = httpMock.expectOne(`${environment.apiUrl}/users/42`);
    expect(request.request.method).toBe('GET');
    request.flush(currentUser);

    expect(profile?.id).toBe(42);
    expect(profile?.roles).toEqual(['ADMIN', 'USER']);
  });

  it('should send a boolean to toggle admin role', () => {
    let receivedRoles: string[] | undefined;

    userService.setAdminRole(12, true).subscribe((profile) => {
      receivedRoles = profile.roles;
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/users/12/roles`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ admin: true });

    const dto: UserProfileDto = {
      id: 12,
      pseudo: 'globetrotter',
      firstName: 'Alicia',
      lastName: 'Keys',
      roles: ['ROLE_USER', 'ROLE_ADMIN'],
      travelDiaries: [],
    };

    request.flush(dto);

    expect(receivedRoles).toEqual(['USER', 'ADMIN']);
  });

  it('should emit an error when requesting profile while not authenticated', (done) => {
    authService.saveCurrentUser(null);

    userService.getCurrentUserProfile().subscribe({
      next: () => done.fail('Expected an authentication error'),
      error: (err) => {
        expect(err?.message).toBe("L'utilisateur n'est pas authentifié");
        done();
      },
    });

    httpMock.expectNone(`${environment.apiUrl}/auth/me`);
  });

  it('should default to USER role when API returns no roles', () => {
    let receivedRoles: string[] | undefined;

    userService.getUserProfile(7).subscribe((profile) => {
      receivedRoles = profile.roles;
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/users/7`);
    expect(request.request.method).toBe('GET');

    const dto: UserProfileDto = {
      id: 7,
      pseudo: 'nomad',
      firstName: 'John',
      lastName: 'Smith',
      roles: [],
      travelDiaries: [],
    };
    request.flush(dto);

    expect(receivedRoles).toEqual(['USER']);
  });
});
