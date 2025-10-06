import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '@service/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Guard minimaliste : laisse passer si un utilisateur est présent dans l'état d'authentification,
 * sinon redirige vers /login et bloque l'accès.
 */
export const authGuard: CanActivateFn = (route, state): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUser()) {
    return true;
  }

  const redirectExtras = state?.url ? { queryParams: { redirectTo: state.url } } : {};

  return authService.loadCurrentUser().pipe(
    map((user) => {
      if (user) {
        return true;
      }

      return router.createUrlTree(['/login'], redirectExtras);
    }),
    catchError(() => of(router.createUrlTree(['/login'], redirectExtras)))
  );
};
