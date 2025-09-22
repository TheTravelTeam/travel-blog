import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, throwError } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';
import { UserProfileDto } from '@dto/user-profile.dto';
import { UserProfile } from '@model/user-profile.model';
import { AuthService } from './auth.service';

/**
 * Centralise la récupération des informations utilisateur (profil, rôles, token).
 * Les méthodes exposent un modèle `UserProfile` déjà normalisé pour le front.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Retourne le profil du user courant en se basant sur l'identifiant décodé dans le JWT.
   * @throws Error si l'utilisateur n'est pas authentifié.
   */
  getCurrentUserProfile(): Observable<UserProfile> {
    const userId = this.currentUserId();
    if (!userId) {
      return throwError(() => new Error("L'utilisateur n'est pas authentifié"));
    }

    return this.getUserProfile(userId);
  }

  /**
   * Récupère un profil spécifique puis le map.
   * @param userId identifiant de l'utilisateur à interroger.
   */
  getUserProfile(userId: number): Observable<UserProfile> {
    return this.http
      .get<UserProfileDto>(`${this.apiUrl}/users/${userId}`)
      .pipe(map((dto) => this.mapProfile(dto)));
  }

  /**
   * Décode l'identifiant stocké dans le JWT.
   * Retourne `null` si aucun token n'est présent ou si celui-ci n'est pas exploitable.
   */
  currentUserId(): number | null {
    const token = this.authService.getToken();

    if (!token) {
      return null;
    }

    try {
      const payload = jwtDecode<{ uid?: unknown }>(token);
      if (typeof payload.uid === 'number' && Number.isInteger(payload.uid)) {
        return payload.uid;
      }
      return null;
    } catch (error) {
      console.warn('Impossible de décoder le token.', error);
      return null;
    }
  }

  /**
   * Transforme la structure brute (`UserProfileDto`) en modèle simplifié consommé par les composants.
   */
  private mapProfile(dto: UserProfileDto): UserProfile {
    const roles = (dto.roles ?? []).map((role) => role.replace(/^ROLE_/, '').toUpperCase());

    return {
      id: dto.id,
      pseudo: dto.pseudo,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      biography: dto.biography,
      avatar: dto.avatar,
      status: dto.status,
      enabled: dto.enabled,
      roles: roles.length ? roles : ['USER'],
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      travelDiaries: dto.travelDiaries,
    };
  }
}
