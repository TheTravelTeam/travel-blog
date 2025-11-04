import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';
import { UserProfileDto } from '@dto/user-profile.dto';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private http = inject(HttpClient);

  // 🔑 Signal pour stocker l’utilisateur courant
  currentUser = signal<UserProfileDto | null>(null);

  /**
   * Authentifie l’utilisateur.
   * Charge ensuite l’utilisateur courant dans le signal.
   */
  login(email: string, password: string): Observable<string> {
    return this.http
      .post(
        `${this.apiUrl}/login`,
        { email, password },
        {
          responseType: 'text',
          withCredentials: environment.useCredentials,
        }
      )
      .pipe(tap(() => this.loadCurrentUser().subscribe()));
  }

  /**
   * Enregistre un nouvel utilisateur.
   * Typé en void si on ne se sert pas de la réponse.
   */
  register(email: string, password: string, pseudo: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/register`, { email, password, pseudo });
  }

  /**
   * Déclenche l'envoi d'un lien de réinitialisation de mot de passe pour l'email fourni.
   */
  requestPasswordReset(email: string): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/forgot-password`,
      { email },
      { withCredentials: environment.useCredentials }
    );
  }

  /**
   * Réinitialise le mot de passe en utilisant le jeton fourni par email.
   */
  resetPassword(token: string, password: string): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/reset-password`,
      { token, password },
      { withCredentials: environment.useCredentials }
    );
  }

  /**
   * Déconnecte l’utilisateur et vide le signal.
   */
  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/logout`, {}, { withCredentials: environment.useCredentials })
      .pipe(
        tap(() => this.currentUser.set(null)) // 🔑 vide le signal
      );
  }

  /**
   * Charge l’utilisateur courant depuis le serveur et met à jour le signal.
   */
  loadCurrentUser(): Observable<UserProfileDto> {
    return this.http
      .get<UserProfileDto>(`${this.apiUrl}/me`, {
        withCredentials: environment.useCredentials,
      })
      .pipe(
        tap({
          next: (user) => this.currentUser.set(user),
          error: () => this.currentUser.set(null),
        })
      );
  }
}
