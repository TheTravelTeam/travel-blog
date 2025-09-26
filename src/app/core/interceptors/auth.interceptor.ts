import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const AUTH_HEADER = 'Authorization';
const CLOUDINARY_API_BASE = 'https://api.cloudinary.com/';

/**
 * Centralise la configuration des requêtes HTTP sortantes :
 * - Cloudinary impose l'absence de credentials et d'en-tête Authorization.
 * - Les appels vers l'API applicative doivent transporter les cookies (JWT en HTTP-only).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isCloudinary = req.url.startsWith(CLOUDINARY_API_BASE);
  const isApiCall = req.url.startsWith(environment.apiUrl);

  if (isCloudinary) {
    const sanitizedRequest = req.clone({
      headers: req.headers.delete(AUTH_HEADER),
      withCredentials: false,
    });
    return next(sanitizedRequest);
  }

  if (environment.useCredentials && isApiCall && req.withCredentials !== true) {
    return next(req.clone({ withCredentials: true }));
  }

  return next(req);
};
