import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { TravelDiaryCardComponent } from 'components/Molecules/Card-ready-to-use/travel-diary-card/travel-diary-card.component';
import { UserService } from '@service/user.service';
import { StepService } from '@service/step.service';
import { TravelMapStateService } from '@service/travel-map-state.service';
import { BreakpointService } from '@service/breakpoint.service';
import { UserProfileDto } from '@dto/user-profile.dto';
import { TravelDiary } from '@model/travel-diary.model';
import { IconName } from '@model/icon.model';
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Internal projection of a travel diary tailored for the admin view.
 */
interface AdminDiarySummary {
  id: number;
  title: string;
  destination?: string;
  coverUrl?: string | null;
  durationLabel?: string;
  stepCount?: number;
  isPrivate: boolean;
  status: string;
  isPublished: boolean;
}

/**
 * Aggregated information required to manage a user and their diaries.
 */
interface AdminUserSummary {
  id: number;
  name: string;
  email: string | null;
  pseudo: string;
  firstName?: string | null;
  lastName?: string | null;
  biography?: string | null;
  avatar?: string | null;
  isAdmin: boolean;
  status: string | null;
  diaries: AdminDiarySummary[];
}

/**
 * Administration section embedded in the "Me" page to let admins inspect
 * and moderate other users as well as their travel diaries.
 */
@Component({
  selector: 'app-admin-users-section',
  standalone: true,
  imports: [CommonModule, ButtonComponent, IconComponent, TravelDiaryCardComponent],
  templateUrl: './admin-users-section.component.html',
  styleUrl: './admin-users-section.component.scss',
})
export class AdminUsersSectionComponent implements OnInit, OnDestroy {
  private readonly userService = inject(UserService);
  private readonly stepService = inject(StepService);
  private readonly travelMapState = inject(TravelMapStateService);
  private readonly breakpointService = inject(BreakpointService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();
  private readonly defaultDiaryCover = '/Images/nosy-iranja.jpg';

  readonly isMobile = this.breakpointService.isMobile;

  readonly searchTerm = signal('');
  readonly managedUsers = signal<AdminUserSummary[]>([]);
  readonly managedUsersLoading = signal(false);
  readonly managedUsersError = signal<string | null>(null);
  readonly userFeedback = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  readonly selectedUser = signal<AdminUserSummary | null>(null);
  readonly selectedUserId = signal<number | null>(null);
  readonly selectedUserLoading = signal(false);
  readonly selectedUserError = signal<string | null>(null);

  readonly userAction = signal<number | null>(null);
  readonly diaryFeedback = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  private readonly pendingDiaryActions = signal(new Set<string>());

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.managedUsers();
    }
    return this.managedUsers().filter((user) => user.name.toLowerCase().includes(term));
  });

  /** Loads the initial set of managed users when the component starts. */
  ngOnInit(): void {
    this.loadUsers();
  }

  /** Tears down the component by releasing pending subscriptions. */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Forces a refresh of the managed users list, ignoring caches. */
  reload(): void {
    this.loadUsers(true);
  }

  /** Applies a textual filter to the managed users list. */
  onSearch(term: string): void {
    this.searchTerm.set(term);
  }

  /** Retrieves detailed information for a specific user. */
  onSelectUser(userId: number): void {
    this.selectedUserId.set(userId);
    this.selectedUserError.set(null);
    const cached = this.managedUsers().find((user) => user.id === userId) ?? null;
    this.selectedUser.set(cached);
    this.diaryFeedback.set(null);
    this.pendingDiaryActions.set(new Set());

    this.selectedUserLoading.set(true);
    this.userService
      .getUserProfile(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile) => {
          const summary = this.mapProfileToUser(profile);
          this.selectedUser.set(summary);
          this.managedUsers.update((users) => {
            const index = users.findIndex((user) => user.id === summary.id);
            if (index === -1) {
              return [...users, summary];
            }
            const clone = [...users];
            clone[index] = summary;
            return clone;
          });
          this.selectedUserLoading.set(false);
        },
        error: (err) => {
          this.selectedUserLoading.set(false);
          this.selectedUserError.set(
            err?.message ?? "Impossible de charger les carnets de l'utilisateur."
          );
          console.error('admin user details fetch failed', err);
        },
      });
  }

  /** Clears the current user selection and any related feedback. */
  clearSelection(): void {
    this.selectedUserId.set(null);
    this.selectedUser.set(null);
    this.selectedUserLoading.set(false);
    this.selectedUserError.set(null);
    this.diaryFeedback.set(null);
    this.pendingDiaryActions.set(new Set());
  }

  /** Indicates if a mutation is currently running for a given user. */
  isUserActionPending(userId: number): boolean {
    return this.userAction() === userId;
  }

  getUserStatusLabel(user: AdminUserSummary): string {
    const status = user.status?.toUpperCase();
    switch (status) {
      case 'BLOCKED':
        return 'Bloqué';
      case 'SUSPENDED':
        return 'Suspendu';
      case 'INACTIVE':
        return 'Inactif';
      case 'ACTIVE':
      case 'ENABLED':
        return 'Actif';
      default:
        return status ?? 'Statut inconnu';
    }
  }

  getUserStatusToggleLabel(user: AdminUserSummary): string {
    const isBlocked = user.status?.toUpperCase() === 'BLOCKED';
    return isBlocked ? 'Réactiver' : 'Bloquer';
  }

  getUserStatusToggleIcon(user: AdminUserSummary): IconName {
    const isBlocked = user.status?.toUpperCase() === 'BLOCKED';
    return isBlocked ? 'check_circle' : 'disabled_by_default';
  }

  /** Indicates if an asynchronous diary action is currently running. */
  isDiaryActionPending(userId: number, diaryId: number): boolean {
    return this.pendingDiaryActions().has(this.getDiaryActionKey(userId, diaryId));
  }

  /** Flips the admin flag for a user after hitting the supporting API. */
  toggleAdmin(userId: number): void {
    if (this.isUserActionPending(userId)) {
      return;
    }
    const target = this.managedUsers().find((user) => user.id === userId);
    if (!target) {
      return;
    }

    const admin = !target.isAdmin;
    this.managedUsersError.set(null);
    this.userFeedback.set(null);
    this.userAction.set(userId);

    this.userService
      .setAdminRole(userId, admin)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile) => {
          const summary = this.mapProfileToUser(profile);
          this.refreshUsersList(summary);
          this.userFeedback.set({
            type: 'success',
            message: admin
              ? 'Rôle administrateur attribué avec succès.'
              : 'Rôle administrateur retiré avec succès.',
          });
          this.userAction.set(null);
        },
        error: (err) => {
          const message =
            err?.message ?? "Impossible de mettre à jour le rôle administrateur.";
          this.managedUsersError.set(message);
          this.userFeedback.set({ type: 'error', message });
          this.userAction.set(null);
          console.error('admin toggle failed', err);
        },
      });
  }

  blockUser(userId: number): void {
    if (this.isUserActionPending(userId)) {
      return;
    }

    const target = this.managedUsers().find((user) => user.id === userId);
    if (!target) {
      return;
    }

    const email = (target.email ?? '').trim();
    const pseudo = target.pseudo.trim();

    if (!email || !pseudo) {
      this.userFeedback.set({
        type: 'error',
        message:
          "Impossible d'actualiser le statut : l'utilisateur ne possède pas d'email ou de pseudo valide.",
      });
      return;
    }

    const nextStatus = target.status?.toUpperCase() === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';

    this.managedUsersError.set(null);
    this.userFeedback.set(null);
    this.userAction.set(userId);

    const payload = this.buildUserUpdatePayload(target, nextStatus, email, pseudo);

    this.userService
      .updateUser(userId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile) => {
          const summary = this.mapProfileToUser(profile);
          if (!profile.travelDiaries?.length) {
            const existing = this.selectedUserId() === userId
              ? this.selectedUser()
              : this.managedUsers().find((user) => user.id === userId) ?? null;
            if (existing) {
              summary.diaries = existing.diaries;
            }
          }
          this.refreshUsersList(summary);
          this.userFeedback.set({
            type: 'success',
            message:
              nextStatus === 'BLOCKED'
                ? 'Utilisateur bloqué avec succès.'
                : 'Utilisateur réactivé avec succès.',
          });
          this.userAction.set(null);
        },
        error: (err) => {
          const message = err?.message ?? 'Impossible de mettre à jour le statut utilisateur.';
          this.managedUsersError.set(message);
          this.userFeedback.set({ type: 'error', message });
          this.userAction.set(null);
          console.error('admin user status update failed', err);
        },
      });
  }

  removeUser(userId: number): void {
    if (this.isUserActionPending(userId)) {
      return;
    }
    const exists = this.managedUsers().some((user) => user.id === userId);
    if (!exists) {
      return;
    }

    this.managedUsersError.set(null);
    this.userFeedback.set(null);
    this.userAction.set(userId);

    this.userService
      .deleteUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.userAction.set(null);
          this.managedUsers.update((users) => users.filter((user) => user.id !== userId));

          if (this.selectedUserId() === userId) {
            this.clearSelection();
          }

          this.userFeedback.set({ type: 'success', message: 'Utilisateur supprimé avec succès.' });
        },
        error: (err: HttpErrorResponse) => {
          const message =
            err?.message ?? "Impossible de supprimer l'utilisateur pour le moment.";
          this.userFeedback.set({ type: 'error', message });
          this.userAction.set(null);
          console.error('admin delete user failed', err);
        },
      });
  }

  /** Redirects administrators to the travels map focused on the selected diary. */
  openDiaryOnMap(diaryId: number): void {
    void this.router.navigate(['/travels', diaryId]);
  }

  /**
   * Updates the privacy flag of a diary and keeps the local cache in sync.
   */
  toggleDiaryPrivacy(userId: number, diaryId: number): void {
    const user = this.selectedUser();
    if (!user || user.id !== userId || this.isDiaryActionPending(userId, diaryId)) {
      return;
    }

    const diary = user.diaries.find((entry) => entry.id === diaryId);
    if (!diary) {
      return;
    }

    const nextPrivacy = !diary.isPrivate;
    this.diaryFeedback.set(null);
    this.markDiaryAction(userId, diaryId, true);

    this.stepService
      .updateDiary(diaryId, { isPrivate: nextPrivacy })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDiary) => {
          this.updateDiaryState(userId, updatedDiary, { isPrivate: nextPrivacy });
          const message = nextPrivacy ? 'Carnet rendu privé.' : 'Carnet rendu public.';
          this.diaryFeedback.set({ type: 'success', message });
          this.markDiaryAction(userId, diaryId, false);
        },
        error: (err) => {
          this.diaryFeedback.set({
            type: 'error',
            message: this.mapDiaryError(err, 'Impossible de mettre à jour la confidentialité.'),
          });
          this.markDiaryAction(userId, diaryId, false);
          console.error('admin diary privacy toggle failed', err);
        },
      });
  }

  /**
   * Switches a diary between disabled and active states for moderation purposes.
   */
  toggleDiaryStatus(userId: number, diaryId: number): void {
    const user = this.selectedUser();
    if (!user || user.id !== userId || this.isDiaryActionPending(userId, diaryId)) {
      return;
    }

    const diary = user.diaries.find((entry) => entry.id === diaryId);
    if (!diary) {
      return;
    }

    const nextStatus = diary.status === 'DISABLED' ? 'IN_PROGRESS' : 'DISABLED';
    this.diaryFeedback.set(null);
    this.markDiaryAction(userId, diaryId, true);

    this.stepService
      .updateDiary(diaryId, { status: nextStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDiary) => {
          this.updateDiaryState(userId, updatedDiary, { status: nextStatus });
          const message = nextStatus === 'DISABLED' ? 'Carnet désactivé.' : 'Carnet réactivé.';
          this.diaryFeedback.set({ type: 'success', message });
          this.markDiaryAction(userId, diaryId, false);
        },
        error: (err) => {
          this.diaryFeedback.set({
            type: 'error',
            message: this.mapDiaryError(err, "Impossible de mettre à jour le statut."),
          });
          this.markDiaryAction(userId, diaryId, false);
          console.error('admin diary status toggle failed', err);
        },
      });
  }

  /** Displays a placeholder message for the unimplemented diary deletion flow. */
  deleteDiary(userId: number, diaryId: number): void {
    const user = this.selectedUser();
    if (!user || user.id !== userId || this.isDiaryActionPending(userId, diaryId)) {
      return;
    }

    const diaryExists = user.diaries.some((entry) => entry.id === diaryId);
    if (!diaryExists) {
      return;
    }

    this.diaryFeedback.set(null);
    this.markDiaryAction(userId, diaryId, true);

    this.stepService
      .deleteDiary(diaryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.markDiaryAction(userId, diaryId, false);
          this.removeDiaryState(userId, diaryId);
          this.diaryFeedback.set({ type: 'success', message: 'Carnet supprimé avec succès.' });
        },
        error: (err) => {
          this.markDiaryAction(userId, diaryId, false);
          this.diaryFeedback.set({
            type: 'error',
            message: this.mapDiaryError(err, 'Impossible de supprimer le carnet.'),
          });
          console.error('admin diary delete failed', err);
        },
      });
  }

  /** Resolves the cover image URL to display for a diary card. */
  getDiaryCover(diary: AdminDiarySummary): string {
    return diary.coverUrl ?? this.defaultDiaryCover;
  }

  /** Builds a compact subtitle combining destination, duration, and steps. */
  getDiarySubtitle(diary: AdminDiarySummary): string {
    const parts = [diary.destination, diary.durationLabel];
    if (typeof diary.stepCount === 'number') {
      parts.push(`${diary.stepCount} étape${diary.stepCount > 1 ? 's' : ''}`);
    }
    return parts.filter(Boolean).join(' • ');
  }

  /** Maps internal diary statuses to human-readable labels. */
  getDiaryStatusLabel(diary: AdminDiarySummary): string {
    switch (diary.status) {
      case 'DISABLED':
        return 'Désactivé';
      case 'COMPLETED':
        return 'Terminé';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'DRAFT':
        return 'Brouillon';
      case 'PUBLISHED':
        return 'Publié';
      default:
        return diary.status || 'Statut inconnu';
    }
  }

  /** Defines the CTA label for toggling a diary status. */
  getDiaryStatusToggleLabel(diary: AdminDiarySummary): string {
    return diary.status === 'DISABLED' ? 'Réactiver' : 'Désactiver';
  }

  /** Selects the icon matching the action used to toggle a diary status. */
  getDiaryStatusToggleIcon(diary: AdminDiarySummary): IconName {
    return diary.status === 'DISABLED' ? 'check_circle' : 'disabled_by_default';
  }

  /** Translates the publication flag into a localized badge text. */
  getDiaryPublicationLabel(diary: AdminDiarySummary): string {
    if (diary.isPublished === false) {
      return 'Non publié';
    }
    if (diary.isPublished === true) {
      return 'Publié';
    }
    return 'Publication inconnue';
  }

  private createManagedDiarySummary(diary: TravelDiary): AdminDiarySummary {
    const steps = Array.isArray(diary.steps) ? diary.steps : [];
    const status = typeof diary.status === 'string' ? diary.status : 'IN_PROGRESS';
    const isPrivate = this.extractBooleanField(diary, 'private', 'isPrivate');
    const isPublished = this.extractBooleanField(diary, 'published', 'isPublished');
    const normalized = { ...diary, steps, private: isPrivate, published: isPublished } as TravelDiary;

    return {
      id: normalized.id,
      title: normalized.title,
      destination: this.getDiaryDestination(normalized),
      coverUrl: this.travelMapState.getDiaryCoverUrl(normalized) ?? this.defaultDiaryCover,
      durationLabel: undefined,
      stepCount: normalized.steps.length,
      isPrivate,
      status,
      isPublished,
    };
  }

  private extractBooleanField(
    diary: TravelDiary,
    primary: 'private' | 'published',
    fallback: 'isPrivate' | 'isPublished'
  ): boolean {
    const direct = diary[primary];
    if (typeof direct === 'boolean') {
      return direct;
    }

    const fallbackSource = diary as unknown as Record<string, unknown>;
    const fromApi = fallbackSource[fallback];
    return typeof fromApi === 'boolean' ? (fromApi as boolean) : false;
  }

  private getDiaryDestination(diary: TravelDiary): string {
    const steps = Array.isArray(diary.steps) ? diary.steps : [];
    const firstStep = steps[0];
    return firstStep?.country || firstStep?.title || '';
  }

  private loadUsers(force = false): void {
    if (!force && (this.managedUsersLoading() || this.managedUsers().length)) {
      return;
    }

    this.managedUsersLoading.set(true);
    this.managedUsersError.set(null);
    if (force) {
      this.userFeedback.set(null);
    }

    this.userService
      .getAllUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profiles) => {
          const summaries = profiles.map((profile) => this.mapProfileToUser(profile));
          this.managedUsers.set(summaries);
          this.managedUsersLoading.set(false);
        },
        error: (err) => {
          this.managedUsersLoading.set(false);
          this.managedUsersError.set(
            err?.message ?? 'Impossible de charger la liste des utilisateurs.'
          );
          console.error('admin users fetch failed', err);
        },
      });
  }

  private mapProfileToUser(profile: UserProfileDto): AdminUserSummary {
    const diaries = (profile.travelDiaries ?? []).map((diary) => this.createManagedDiarySummary(diary));
    const status = profile.status ? profile.status.toUpperCase() : null;
    return {
      id: profile.id,
      name: this.buildDisplayName(profile),
      email: profile.email ?? null,
      pseudo: profile.pseudo,
      firstName: profile.firstName ?? null,
      lastName: profile.lastName ?? null,
      biography: profile.biography ?? null,
      avatar: profile.avatar ?? null,
      isAdmin: (profile.roles ?? []).includes('ADMIN'),
      status,
      diaries,
    };
  }

  private buildDisplayName(profile: UserProfileDto): string {
    const firstName = profile.firstName?.trim() ?? '';
    const lastName = profile.lastName?.trim() ?? '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || profile.pseudo;
  }

  private refreshUsersList(summary: AdminUserSummary): void {
    this.managedUsers.update((users) => {
      const index = users.findIndex((user) => user.id === summary.id);
      if (index === -1) {
        return [...users, summary];
      }
      const clone = [...users];
      clone[index] = summary;
      return clone;
    });

    if (this.selectedUserId() === summary.id) {
      this.selectedUser.set(summary);
    }
  }

  private updateDiaryState(userId: number, diary: TravelDiary, overrides?: Partial<AdminDiarySummary>): void {
    const summary = this.createManagedDiarySummary(diary);
    const merged: AdminDiarySummary = {
      ...summary,
      ...(overrides ?? {}),
    };

    this.managedUsers.update((users) =>
      users.map((user) => {
        if (user.id !== userId) {
          return user;
        }
        const diaries = (() => {
          const index = user.diaries.findIndex((entry) => entry.id === merged.id);
          if (index === -1) {
            return [...user.diaries, merged];
          }
          const clone = [...user.diaries];
          clone[index] = merged;
          return clone;
        })();
        return { ...user, diaries } satisfies AdminUserSummary;
      })
    );

    const selected = this.selectedUser();
    if (selected && selected.id === userId) {
      const diaries = (() => {
        const index = selected.diaries.findIndex((entry) => entry.id === merged.id);
        if (index === -1) {
          return [...selected.diaries, merged];
        }
        const clone = [...selected.diaries];
        clone[index] = merged;
        return clone;
      })();
      this.selectedUser.set({ ...selected, diaries });
    }
  }

  private removeDiaryState(userId: number, diaryId: number): void {
    this.managedUsers.update((users) =>
      users.map((user) => {
        if (user.id !== userId) {
          return user;
        }
        const diaries = user.diaries.filter((entry) => entry.id !== diaryId);
        return { ...user, diaries } satisfies AdminUserSummary;
      })
    );

    const selected = this.selectedUser();
    if (selected && selected.id === userId) {
      const diaries = selected.diaries.filter((entry) => entry.id !== diaryId);
      this.selectedUser.set({ ...selected, diaries });
    }
  }

  private markDiaryAction(userId: number, diaryId: number, pending: boolean): void {
    this.pendingDiaryActions.update((current) => {
      const copy = new Set(current);
      const key = this.getDiaryActionKey(userId, diaryId);
      if (pending) {
        copy.add(key);
      } else {
        copy.delete(key);
      }
      return copy;
    });
  }

  private getDiaryActionKey(userId: number, diaryId: number): string {
    return `${userId}:${diaryId}`;
  }

  private mapDiaryError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 403) {
        return "Droits insuffisants pour réaliser cette action.";
      }
      const messageFromBody = (() => {
        const body = err.error as { message?: unknown } | string | null | undefined;
        if (typeof body === 'string') {
          return body;
        }
        if (body && typeof body === 'object' && typeof body.message === 'string') {
          return body.message;
        }
        return null;
      })();
      if (messageFromBody) {
        return messageFromBody;
      }
    }
    if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
      return err.message as string;
    }
    return fallback;
  }

  private buildUserUpdatePayload(
    target: AdminUserSummary,
    nextStatus: string,
    email: string,
    pseudo: string
  ): Partial<UserProfileDto> {
    const payload: Partial<UserProfileDto> = {
      status: nextStatus,
      pseudo,
      email,
    };

    if (target.firstName) {
      payload.firstName = target.firstName;
    }
    if (target.lastName) {
      payload.lastName = target.lastName;
    }
    if (typeof target.biography === 'string') {
      payload.biography = target.biography;
    }

    return payload;
  }
}
