import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { UserProfileDto } from '@dto/user-profile.dto';

class AuthServiceStub {
  private token: string | null = null;

  getToken(): string | null {
    return this.token;
  }

  saveToken(token: string | null): void {
    this.token = token;
  }
}

const TOKEN_WITH_NUMERIC_UID =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjQyfQ.signature';
const TOKEN_WITH_NON_NUMERIC_UID =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJhYmMifQ.signature';
const TOKEN_WITH_INVALID_STRUCTURE = 'invalid-token';

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

  it('should load the current user profile with the id decoded from the token', () => {
    authService.saveToken(TOKEN_WITH_NUMERIC_UID);

    let profileId: number | undefined;
    let roles: string[] | undefined;

    userService.getCurrentUserProfile().subscribe((profile) => {
      profileId = profile.id;
      roles = profile.roles;
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/users/42`);
    expect(request.request.method).toBe('GET');

    const dto: UserProfileDto = {
      id: 42,
      pseudo: 'wanderer',
      firstName: 'Jane',
      lastName: 'Doe',
      roles: ['ROLE_admin', 'ROLE_user'],
      travelDiaries: [],
    };
    request.flush(dto);

    expect(profileId).toBe(42);
    expect(roles).toEqual(['ADMIN', 'USER']);
  });

  it('should emit an error when requesting current user profile without authentication', (done) => {
    authService.saveToken(null);

    userService.getCurrentUserProfile().subscribe({
      next: () => done.fail('Expected an authentication error'),
      error: (err) => {
        expect(err?.message).toBe("L'utilisateur n'est pas authentifié");
        done();
      },
    });

    httpMock.expectNone(`${environment.apiUrl}/users/`);
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

  it('should return null when no token is stored', () => {
    authService.saveToken(null);

    const result = userService.currentUserId();

    expect(result).toBeNull();
  });

  it('should return null when token does not expose a numeric userId', () => {
    authService.saveToken(TOKEN_WITH_NON_NUMERIC_UID);

    const result = userService.currentUserId();

    expect(result).toBeNull();
  });

  it('should return null when token decoding fails', () => {
    authService.saveToken(TOKEN_WITH_INVALID_STRUCTURE);

    const result = userService.currentUserId();

    expect(result).toBeNull();
  });
});
