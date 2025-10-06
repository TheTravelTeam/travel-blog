import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '@service/auth.service';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * Empêche un utilisateur déjà connecté de voir les pages publiques (login/register).
 * Redirige vers la page d'accueil et bloque la navigation.
 */
export const visitorOnlyGuard: CanActivateFn = (): boolean | UrlTree | Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUser()) {
    return router.createUrlTree(['/']);
  }

  return authService
    .loadCurrentUser()
    .pipe(
      map((user) => (user ? router.createUrlTree(['/']) : true)),
      catchError(() => of(true))
    );
};
