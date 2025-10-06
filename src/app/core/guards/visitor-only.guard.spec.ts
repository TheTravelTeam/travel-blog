import { signal } from '@angular/core';
import { GuardResult, Router, UrlTree } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { visitorOnlyGuard } from './visitor-only.guard';
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

describe('visitorOnlyGuard (simplified)', () => {
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

  function executeGuard(): Promise<GuardResult> {
    return TestBed.runInInjectionContext(async () => {
      const outcome = visitorOnlyGuard({} as any, {} as any);
      if (isObservable(outcome)) {
        return firstValueFrom(outcome);
      }
      return outcome;
    });
  }

  it('allows visitors to access the route when no session is found', async () => {
    authService.setCurrentUser(null);
    authService.loadCurrentUser.and.returnValue(of(null));

    const result = await executeGuard();

    expect(result).toBeTrue();
  });

  it('redirects cached authenticated users to home', async () => {
    authService.setCurrentUser({ id: 1, pseudo: 'traveler' });

    const result = (await executeGuard()) as UrlTree;

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result)).toBe('/');
  });

  it('redirects authenticated users discovered via API', async () => {
    authService.setCurrentUser(null);
    authService.loadCurrentUser.and.returnValue(of({ id: 5, pseudo: 'api-user' } as UserProfileDto));

    const result = (await executeGuard()) as UrlTree;

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result)).toBe('/');
  });

  it('keeps visitors when the API errors', async () => {
    authService.setCurrentUser(null);
    authService.loadCurrentUser.and.returnValue(throwError(() => new Error('401')));

    const result = await executeGuard();

    expect(result).toBeTrue();
  });
});
