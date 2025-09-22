import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@service/auth.service';

const AUTH_HEADER = 'Authorization';

/**
 * Attache automatiquement le jeton JWT stocke dans l'AuthService aux requetes HTTP sortantes.
 * Ignore les appels de connexion ou ceux qui renseignent deja Authorization pour laisser la main
 * a des requetes personnalisees.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (!token || req.headers.has(AUTH_HEADER) || req.url.includes('/auth/login')) {
    return next(req);
  }

  const authRequest = req.clone({
    setHeaders: {
      [AUTH_HEADER]: `Bearer ${token}`,
    },
  });

  return next(authRequest);
};
