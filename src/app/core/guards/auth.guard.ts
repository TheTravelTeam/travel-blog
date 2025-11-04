import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '@service/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Guard minimaliste : laisse passer si un utilisateur est présent dans l'état d'authentification,
 * sinon redirige vers /login et bloque l'accès.
 */
export const authGuard: CanActivateFn = (): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUser()) {
    return true;
  }

  const loginTree = router.createUrlTree(['/login']);

  return authService.loadCurrentUser().pipe(
    map((user) => (user ? true : loginTree)),
    catchError(() => of(loginTree))
  );
};
