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
  // 📌 Toutes les données partagées entre les composants
  steps = signal<Step[]>([]);
  currentDiary = signal<TravelDiary | null>(null);
  currentDiaryId = signal<number | null>(null);
  allDiaries = signal<TravelDiary[]>([]);
  visibleDiaries = signal<TravelDiary[]>([]);
  openedStepId = signal<number | null>(null);
  openedCommentStepId = signal<number | null>(null);
  mapCenterCoords = signal<{ lat: number; lng: number } | null>(null);
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

    return steps.map((step) => ({
      ...step,
      themeIds: Array.isArray(step?.themeIds)
        ? step.themeIds.filter((value): value is number => Number.isFinite(value as number))
        : [],
      themes: Array.isArray(step?.themes) ? (step.themes as Theme[]) : [],
    })) as Step[];
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
}
