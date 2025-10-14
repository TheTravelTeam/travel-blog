/// <reference types="jasmine" />

import { signal } from '@angular/core';
import { GuardResult, Router, UrlTree } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { authGuard } from './auth.guard';
import { AuthService } from '@service/auth.service';
import { UserProfileDto } from '@dto/user-profile.dto';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';

class AuthServiceStub {
  currentUser = signal<UserProfileDto | null>(null);
  loadCurrentUser = jasmine
    .createSpy('loadCurrentUser')
    .and.callFake(() => (this.currentUser() ? of(this.currentUser()!) : of(null)));

  setCurrentUser(user: UserProfileDto | null): void {
    this.currentUser.set(user);
  }
}

describe('authGuard', () => {
  let authService: AuthServiceStub;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([])],
      providers: [{ provide: AuthService, useClass: AuthServiceStub }],
    });

    authService = TestBed.inject(AuthService) as unknown as AuthServiceStub;
    router = TestBed.inject(Router);
  });

  function executeGuard(url: string): Promise<GuardResult> {
    return TestBed.runInInjectionContext(async () => {
      const outcome = authGuard({} as any, { url } as any);
      if (isObservable(outcome)) {
        return firstValueFrom(outcome);
      }
      return outcome;
    });
  }

  it('allows navigation when a user is already present', () => {
    authService.setCurrentUser({ id: 1, pseudo: 'traveler' });

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, { url: '/me' } as any));

    expect(result).toBeTrue();
    expect(authService.loadCurrentUser).not.toHaveBeenCalled();
  });

  it('loads the current user when missing and authorises access when successful', async () => {
    authService.setCurrentUser(null);
    authService.loadCurrentUser.and.returnValue(of({ id: 2, pseudo: 'lazy' } as UserProfileDto));

    const result = await executeGuard('/me');

    expect(result).toBeTrue();
    expect(authService.loadCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('redirects to login when the backend rejects the session', async () => {
    authService.setCurrentUser(null);
    authService.loadCurrentUser.and.returnValue(throwError(() => new Error('401')));

    const result = (await executeGuard('/me')) as UrlTree;

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result)).toBe('/login?redirectTo=%2Fme');
  });

  it('redirects to login when backend returns null user', async () => {
    authService.setCurrentUser(null);
    authService.loadCurrentUser.and.returnValue(of(null as unknown as UserProfileDto));

    const result = (await executeGuard('/me')) as UrlTree;

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result)).toBe('/login?redirectTo=%2Fme');
  });
});
