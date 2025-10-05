import { computed, Injectable, signal } from '@angular/core';
import { Step } from '@model/step.model';
import { TravelDiary } from '@model/travel-diary.model';
import { Media } from '@model/media.model';
import { Theme } from '@model/theme.model';

/**
 * Service de coordination entre la carte et les pages consommant les carnets.
 * En plus des états partagés (steps, carnet courant...), il centralise la
 * résolution des médias pour éviter de dupliquer du parsing JSON partout.
 */
@Injectable({
  providedIn: 'root',
})
export class TravelMapStateService {
  private readonly blockedDiaryStatuses = new Set(['DISABLED']);
  private readonly blockedAccountStatuses = new Set(['DISABLED', 'BLOCKED', 'INACTIVE']);
  // 📌 Toutes les données partagées entre les composants
  steps = signal<Step[]>([]);
  currentDiary = signal<TravelDiary | null>(null);
  currentDiaryId = signal<number | null>(null);
  allDiaries = signal<TravelDiary[]>([]);
  visibleDiaries = signal<TravelDiary[]>([]);
  openedStepId = signal<number | null>(null);
  openedCommentStepId = signal<number | null>(null);
  mapCenterCoords = signal<{ lat: number; lng: number } | null>(null);
  private likedStepIds = signal<Set<number>>(new Set());
  private viewerLikeOwner: number | null = null;
  completedSteps = computed(() => {
    const currentStepId = this.openedStepId();
    const steps = this.steps();
    const index = steps.findIndex((step) => step.id === currentStepId);
    return index !== -1 ? index + 1 : 0;
  });
  panelHeight = signal<'collapsed' | 'expanded' | 'collapsedDiary'>('collapsed');

  totalStepsCount = computed(() => this.steps().length);
  private hasCustomVisibleDiaries = signal(false);

  // --- Ouverture automatique de la modale de création ---
  shouldOpenCreateModal = signal(false);
  /**
   * Demande l'ouverture automatique de la modale de création
   * au prochain chargement de la page `/travels`.
   */
  /** Requests the opening of the create diary modal on the next navigation. */
  requestCreateModal() {
    this.shouldOpenCreateModal.set(true);
  }
  /**
   * Consomme le drapeau d'ouverture de la modale de création et le réinitialise.
   * Retourne true si une ouverture a été demandée, false sinon.
   */
  /**
   * Consumes the flag triggering the create modal.
   * @returns True when an opening was requested.
   */
  consumeCreateModalRequest(): boolean {
    const flag = this.shouldOpenCreateModal();
    if (flag) {
      this.shouldOpenCreateModal.set(false);
    }
    return flag;
  }

  // --- Ouverture automatique de la modale d'édition de carnet ---
  requestedEditDiaryId = signal<number | null>(null);
  /**
   * Demande l'ouverture automatique de la modale d'édition pour un carnet donné.
   * @param id Identifiant du carnet à éditer
   */
  /**
   * Schedules an edit modal opening for the provided diary id.
   * @param id Identifier of the diary to edit.
   */
  requestEditDiary(id: number) {
    this.requestedEditDiaryId.set(id);
  }
  /**
   * Consumes the pending edit request if any.
   * @returns The targeted diary id or null.
   */
  consumeRequestedEditDiary(): number | null {
    const id = this.requestedEditDiaryId();
    if (id != null) {
      this.requestedEditDiaryId.set(null);
    }
    return id;
  }

  // ✅ Méthodes utilitaires
  /**
   * Updates the shared list of steps (normalised beforehand).
   * @param steps Steps to inject in the shared state.
   */
  setSteps(steps: Step[]) {
    this.steps.set(this.normaliseSteps(steps));
  }

  /**
   * Stores the currently focused diary.
   * @param diary Diary instance or null when none is selected.
   */
  setCurrentDiary(diary: TravelDiary | null) {
    if (!diary) {
      this.currentDiary.set(null);
      return;
    }

    this.currentDiary.set({
      ...diary,
      steps: this.normaliseSteps(diary.steps),
    });
  }

  /** Updates the identifier of the current diary. */
  setCurrentDiaryId(id: number | null) {
    if (this.currentDiaryId() === id) {
      return;
    }
    this.currentDiaryId.set(id);
  }

  /**
   * Replaces the full list of diaries and normalises their steps.
   * @param diaries Diaries to expose to the application.
   */
  setAllDiaries(diaries: TravelDiary[]) {
    if (!Array.isArray(diaries)) {
      this.allDiaries.set([]);
      if (!this.hasCustomVisibleDiaries()) {
        this.visibleDiaries.set([]);
      }
      return;
    }

    const normalised = this.normaliseDiaryList(diaries);

    this.allDiaries.set(normalised);
    if (!this.hasCustomVisibleDiaries()) {
      this.visibleDiaries.set(normalised);
    }
  }

  /**
   * Declares the diaries that should be displayed on the map.
   * @param diaries Filtered diaries subset or null to revert to the full list.
   */
  setVisibleDiaries(diaries: TravelDiary[] | null) {
    if (Array.isArray(diaries)) {
      this.visibleDiaries.set(this.normaliseDiaryList(diaries));
      this.hasCustomVisibleDiaries.set(true);
      return;
    }

    this.visibleDiaries.set(this.allDiaries());
    this.hasCustomVisibleDiaries.set(false);
  }

  /**
   * Marks a step as opened in the detail panel.
   * @param stepId Identifier to select or null to clear.
   */
  setOpenedStepId(stepId: number | null) {
    this.openedStepId.set(stepId);
    // this.updateProgress();
  }

  /**
   * Toggles the comment panel for a given step.
   * @param stepId Step identifier or null to hide the panel.
   */
  setOpenedCommentStepId(stepId: number | null) {
    this.openedCommentStepId.set(stepId);
  }

  /**
   * Updates the map center coordinates used by the UI.
   * @param coords Coordinates or null to reset.
   */
  setMapCenterCoords(coords: { lat: number; lng: number } | null) {
    this.mapCenterCoords.set(coords);
  }

  /** Resets every shared state slice to its initial value. */
  reset() {
    this.steps.set([]);
    this.currentDiary.set(null);
    this.currentDiaryId.set(null);
    this.openedStepId.set(null);
    this.openedCommentStepId.set(null);
    this.mapCenterCoords.set(null);
    this.allDiaries.set([]);
    this.visibleDiaries.set([]);
    this.hasCustomVisibleDiaries.set(false);
    // this.completedSteps.set(0);
  }

  /**
   * Indicates whether the viewer has already liked the provided step.
   * @param stepId Target step identifier.
   */
  hasViewerLikedStep(stepId: number | null | undefined): boolean {
    return typeof stepId === 'number' && this.likedStepIds().has(stepId);
  }

  /**
   * Updates the like counter for a given step and persists the viewer's preference locally.
   * @param stepId Identifier of the targeted step.
   * @param likes Likes value to persist.
   * @param liked Whether the viewer currently likes the step.
   */
  /**
   * Injects a like update inside the shared collections and syncs the preference cache.
   * @param stepId Identifier of the targeted step.
   * @param likes Counter to persist (already normalised / optimistic / final).
   * @param liked Whether the viewer currently likes the step.
   */
  updateStepLikeState(stepId: number, likes: number, liked: boolean): void {
    if (!Number.isFinite(stepId)) {
      return;
    }

    const safeLikes = Math.max(0, Math.round(likes));
    let hasChanged = false;

    const mapStep = (target: Step): Step => {
      if (target.id !== stepId) {
        return target;
      }

      hasChanged = true;
      return {
        ...target,
        likes: safeLikes,
        likesCount: safeLikes,
        viewerHasLiked: liked,
      };
    };

    const updatedSteps = this.steps().map(mapStep);

    if (!hasChanged) {
      return;
    }

    this.steps.set(updatedSteps);

    const diary = this.currentDiary();
    if (diary) {
      const updatedDiarySteps = diary.steps.map(mapStep);
      this.currentDiary.set({ ...diary, steps: updatedDiarySteps });
    }

    this.applyViewerLikePreference(stepId, liked);
  }

  /**
   * Declares the user owning the current like preferences.
   * When the viewer changes, previously cached likes are cleared to avoid
   * reusing another account's state.
   */
  /**
   * Declares the user owning the current like state. When the identifier changes the
   * in-memory cache and the `viewerHasLiked` flags are reset to avoid leaking data
   * between accounts. Pass `null` to clear the context (logout).
   * @param viewerId Identifier of the signed-in user or null when anonymous.
   */
  setViewerLikeOwner(viewerId: number | null): void {
    const nextOwner = Number.isFinite(viewerId) ? (viewerId as number) : null;
    if (this.viewerLikeOwner === nextOwner) {
      return;
    }

    this.viewerLikeOwner = nextOwner;
    this.likedStepIds.set(new Set());

    if (this.viewerLikeOwner === null) {
      this.resetViewerLikeFlags();
      return;
    }

    this.resetViewerLikeFlags();
  }

  /**
   * Clears the currently selected diary while keeping the loaded diaries list.
   * Typically used when returning to the overview map.
   */
  clearCurrentDiarySelection(options?: { preserveVisibleDiaries?: boolean }): void {
    const preserveVisible = options?.preserveVisibleDiaries ?? false;

    this.setSteps([]);
    this.setCurrentDiary(null);
    this.setCurrentDiaryId(null);
    this.setOpenedStepId(null);
    this.setOpenedCommentStepId(null);
    this.setMapCenterCoords(null);
    if (!preserveVisible) {
      this.setVisibleDiaries(null);
    }
  }

  /**
   * Picks a best-effort cover URL from either the diary cover or its steps.
   * @param diary Diary or partial diary carrying media information.
   */
  getDiaryCoverUrl(diary: TravelDiary | { media?: Media | null; steps?: Step[] | null }): string {
    if (!diary) {
      return '';
    }

    const main = this.pickFirstUrl(diary.media ?? null);
    if (main) {
      return main;
    }

    const steps = diary.steps ?? [];
    for (const step of steps) {
      const url = this.pickFirstUrl(this.getStepMediaList(step));
      if (url) {
        return url;
      }
    }

    return '';
  }

  /**
   * Returns every media associated with the provided step.
   * @param step Target step.
   */
  getStepMediaList(step: Step | null | undefined): Media[] {
    if (!step) {
      return [];
    }

    const mediaList: Media[] = [];

    if (Array.isArray(step.media)) {
      mediaList.push(...step.media);
    }

    return mediaList;
  }

  /**
   * Finds the first usable media URL in the provided structure.
   * @param source Single media or list of medias.
   */
  private pickFirstUrl(source: Media | Media[] | null | undefined): string | null {
    if (!source) {
      return null;
    }

    const medias = Array.isArray(source) ? source : [source];
    const media = medias.find((item) => typeof item?.fileUrl === 'string' && item.fileUrl.trim());
    return media?.fileUrl ?? null;
  }

  /**
   * Normalises theme-related fields on incoming step collections.
   * @param steps Raw steps coming from the backend.
   */
  private normaliseSteps(steps: Step[] | null | undefined): Step[] {
    if (!Array.isArray(steps)) {
      return [];
    }

    return steps.map((step) => {
      const likesCount = this.coerceLikes(step?.likesCount ?? step?.likes ?? 0);
      const backendViewerLiked =
        typeof step?.viewerHasLiked === 'boolean' ? step.viewerHasLiked : null;
      const viewerHasLiked =
        backendViewerLiked ?? this.hasViewerLikedStep(step?.id);

      if (backendViewerLiked !== null) {
        this.applyViewerLikePreference(step?.id, backendViewerLiked);
      }

      return {
        ...step,
        themeIds: Array.isArray(step?.themeIds)
          ? step.themeIds.filter((value): value is number => Number.isFinite(value as number))
          : [],
        themes: Array.isArray(step?.themes) ? (step.themes as Theme[]) : [],
        likes: likesCount,
        likesCount,
        viewerHasLiked,
      } as Step;
    });
  }

  private normaliseDiaryList(diaries: TravelDiary[] | null | undefined): TravelDiary[] {
    if (!Array.isArray(diaries)) {
      return [];
    }

    return diaries.map((diary) => ({
      ...diary,
      steps: this.normaliseSteps(diary.steps),
    }));
  }

  /**
   * Determines whether a diary can be displayed to the current audience.
   * Rejects diaries disabled by moderation as well as diaries owned by disabled users.
   * @param diary Diary instance to evaluate.
   */
  isDiaryAccessible(
    diary: TravelDiary | null | undefined,
    options?: { viewerId?: number | null; viewerIsAdmin?: boolean }
  ): boolean {
    if (!diary) {
      return false;
    }

    const viewerId = options?.viewerId ?? null;
    const viewerIsAdmin = options?.viewerIsAdmin ?? false;

    if (viewerIsAdmin) {
      return true;
    }

    const diaryOwnerId = typeof diary.user?.id === 'number' ? diary.user.id : null;
    const isViewerOwner = diaryOwnerId !== null && diaryOwnerId === viewerId;

    if (isViewerOwner) {
      return true;
    }

    if (this.isStatusBlocked(diary.status, this.blockedDiaryStatuses)) {
      return false;
    }

    const owner = diary.user;
    if (!owner) {
      return true;
    }

    if (owner.enabled === false) {
      return false;
    }

    if (this.isStatusBlocked(owner.status, this.blockedAccountStatuses)) {
      return false;
    }

    return true;
  }

  /** Normalises raw status values and compares them against the provided blacklist. */
  private isStatusBlocked(value: unknown, blacklist: Set<string>): boolean {
    const normalized = this.normalizeStatus(value);
    return normalized !== '' && blacklist.has(normalized);
  }

  /** Formats status strings to simplify comparisons (uppercase + stripped separators). */
  private normalizeStatus(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim().toUpperCase().replace(/[\s_-]+/g, '');
  }

  private coerceLikes(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }

    return Math.max(0, Math.round(parsed));
  }

  /**
   * Caches the viewer preference for a given step in memory so that the component can
   * compute the next optimistic action without querying the backend again.
   * @param stepId Targeted step identifier.
   * @param liked Viewer preference to persist (`true` if liked).
   */
  private applyViewerLikePreference(stepId: number | null | undefined, liked: boolean): void {
    if (!Number.isFinite(stepId)) {
      return;
    }

    const next = new Set(this.likedStepIds());
    if (liked) {
      next.add(stepId as number);
    } else {
      next.delete(stepId as number);
    }
    this.likedStepIds.set(next);
  }

  /**
   * Resets every `viewerHasLiked` flag to `false` inside the shared collections. Used when
   * the viewer changes or signs out so the next account starts from a neutral state.
   */
  private resetViewerLikeFlags(): void {
    const resetSteps = this.steps().map((step) => ({ ...step, viewerHasLiked: false }));
    this.steps.set(resetSteps);

    const diary = this.currentDiary();
    if (diary) {
      const resetDiarySteps = diary.steps.map((step) => ({ ...step, viewerHasLiked: false }));
      this.currentDiary.set({ ...diary, steps: resetDiarySteps });
    }
  }
}
