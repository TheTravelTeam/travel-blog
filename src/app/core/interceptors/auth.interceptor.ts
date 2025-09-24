import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '@service/auth.service';

const AUTH_HEADER = 'Authorization';
const CLOUDINARY_API_BASE = 'https://api.cloudinary.com/';

/**
 * Attache automatiquement le jeton JWT stocke dans l'AuthService aux requetes HTTP sortantes.
 * Ignore les appels de connexion ou ceux qui renseignent deja Authorization pour laisser la main
 * a des requetes personnalisees. Nettoie egalement les appels Cloudinary pour respecter leurs
 * contraintes CORS (pas d'en-tete Authorization ni d'envoi de credentials).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const isNominatim = req.url.startsWith('https://nominatim.openstreetmap.org/');
  const isCloudinary = req.url.startsWith(CLOUDINARY_API_BASE);

  if (isCloudinary) {
    const sanitizedRequest = req.clone({
      headers: req.headers.delete(AUTH_HEADER),
      withCredentials: false,
    });
    return next(sanitizedRequest);
  }

  if (!token || req.headers.has(AUTH_HEADER) || isNominatim || req.url.includes('/auth/login')) {
    return next(req);
  }

  const authRequest = req.clone({
    setHeaders: {
      [AUTH_HEADER]: `Bearer ${token}`,
    },
  });

  return next(authRequest);
};
