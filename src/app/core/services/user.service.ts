import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfileDto } from '@dto/user-profile.dto';
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

  currentUser = this.authService.currentUser;

  /**
   * Retourne le profil complet de l'utilisateur connecté.
   * Mappe le DTO de l'API en modèle simplifié.
   *
   * @returns {Observable<UserProfileDto>} Profil de l'utilisateur.
   */
  getCurrentUserProfile(): Observable<UserProfileDto> {
    return this.authService.loadCurrentUser().pipe(
      switchMap((dto) => {
        const hasDiaryArray = Array.isArray(dto.travelDiaries) && dto.travelDiaries.length > 0;

        if (hasDiaryArray) {
          return of(this.mapProfile(dto));
        }

        const userId = dto.id;
        if (typeof userId === 'number' && Number.isFinite(userId)) {
          return this.http
            .get<UserProfileDto>(`${this.apiUrl}/users/${userId}`)
            .pipe(
              map((fullDto) => this.mapProfile(fullDto)),
              catchError((error) => {
                console.warn('Fallback profile fetch without travel diaries failed', error);
                return of(this.mapProfile(dto));
              })
            );
        }

        return of(this.mapProfile(dto));
      })
    );
  }

  /**
   * Retourne l'ID de l'utilisateur connecté, ou `null` si non connecté.
   *
   * @returns {number | null} ID utilisateur.
   */
  currentUserId(): number | null {
    return this.authService.currentUser()?.id ?? null;
  }

  /**
   * Récupère un profil spécifique puis le map.
   * @param userId identifiant de l'utilisateur à interroger.
   */
  getUserProfile(userId: number): Observable<UserProfileDto> {
    return this.http
      .get<UserProfileDto>(`${this.apiUrl}/users/${userId}`)
      .pipe(map((dto) => this.mapProfile(dto)));
  }

  /**
   * Récupère l'ensemble des utilisateurs (profil + carnets éventuels) pour l'administration.
   */
  getAllUsers(): Observable<UserProfileDto[]> {
    return this.http
      .get<UserProfileDto[]>(`${this.apiUrl}/users`)
      .pipe(map((dtos) => dtos.map((dto) => this.mapProfile(dto))));
  }

  /** Met à jour les informations d'un utilisateur existant. */
  updateUser(userId: number, payload: Partial<UserProfileDto>): Observable<UserProfileDto> {
    return this.http
      .put<UserProfileDto>(`${this.apiUrl}/users/${userId}`, payload)
      .pipe(map((dto) => this.mapProfile(dto)));
  }

  /**
   * Supprime un utilisateur via l'API.
   *
   * @param userId identifiant numerique de l'utilisateur a supprimer.
   * @returns Observable qui complete des la suppression confirmee.
   */
  deleteUser(userId: number): Observable<void> {
    return this.http
      .delete(`${this.apiUrl}/users/${userId}`, { responseType: 'text' })
      .pipe(map(() => void 0));
  }

  /**
   * Met a jour le statut administrateur d'un utilisateur via l'API.
   *
   * @param userId identifiant numerique de l'utilisateur cible.
   * @param admin valeur booleenne indiquant si le compte doit posseder le role admin.
   * @returns Profil utilisateur mis a jour avec les roles synchronises.
   */
  setAdminRole(userId: number, admin: boolean): Observable<UserProfileDto> {
    return this.http
      .patch<UserProfileDto>(`${this.apiUrl}/users/${userId}/roles`, { admin })
      .pipe(map((dto) => this.mapProfile(dto)));
  }

  /**
   * Transforme la structure brute (`UserProfileDto`) en modèle simplifié consommé par les composants.
   */
  private mapProfile(dto: UserProfileDto): UserProfileDto {
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
