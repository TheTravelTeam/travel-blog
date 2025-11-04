import { computed, Injectable, signal } from '@angular/core';
import { Step } from '@model/step.model';
import { TravelDiary } from '@model/travel-diary.model';

/**
 * Petit store partagé entre la carte et les pages carnets.
 * État minimal : carnets visibles, carnet courant, étape ouverte, etc.
 */
@Injectable({ providedIn: 'root' })
export class TravelMapStateService {
  /** Étapes du carnet actuellement affiché. */
  readonly steps = signal<Step[]>([]);
  /** Carnet sélectionné dans la carte. */
  readonly currentDiary = signal<TravelDiary | null>(null);
  /** Identifiant du carnet courant. */
  readonly currentDiaryId = signal<number | null>(null);
  /** Tous les carnets chargés pour la carte. */
  readonly allDiaries = signal<TravelDiary[]>([]);
  /** Carnets réellement visibles (peut être filtré). */
  readonly visibleDiaries = signal<TravelDiary[]>([]);
  /** Étape ouverte dans la carte. */
  readonly openedStepId = signal<number | null>(null);
  /** Étape dont les commentaires sont ouverts. */
  readonly openedCommentStepId = signal<number | null>(null);
  /** Centre actuel de la carte. */
  readonly mapCenterCoords = signal<{ lat: number; lng: number } | null>(null);
  /** État du panneau latéral. */
  readonly panelHeight = signal<'collapsed' | 'expanded' | 'collapsedDiary'>('collapsed');

  /** Nombre d'étapes parcourues (position courante dans la liste). */
  readonly completedSteps = computed(() => {
    const openedId = this.openedStepId();
    const index = this.steps().findIndex((step) => step.id === openedId);
    return index === -1 ? 0 : index + 1;
  });

  /** Nombre total d'étapes du carnet courant. */
  readonly totalStepsCount = computed(() => this.steps().length);

  private shouldOpenCreateModal = false;
  private requestedEditDiaryId: number | null = null;

  /** Signale que la modale de création doit s'ouvrir. */
  requestCreateModal(): void {
    this.shouldOpenCreateModal = true;
  }

  /** Consomme le signal d'ouverture de modale de création. */
  consumeCreateModalRequest(): boolean {
    const shouldOpen = this.shouldOpenCreateModal;
    this.shouldOpenCreateModal = false;
    return shouldOpen;
  }

  /** Demande l'ouverture de la modale d'édition pour un carnet. */
  requestEditDiary(id: number): void {
    this.requestedEditDiaryId = id;
  }

  /** Consomme l'identifiant du carnet à éditer (s'il existe). */
  consumeRequestedEditDiary(): number | null {
    const id = this.requestedEditDiaryId;
    this.requestedEditDiaryId = null;
    return id;
  }

  /** Remplace la liste d'étapes du carnet courant. */
  setSteps(steps: Step[] | null | undefined): void {
    const safeSteps = steps ?? [];
    this.steps.set(safeSteps);

    const diary = this.currentDiary();
    if (diary) {
      this.currentDiary.set({ ...diary, steps: safeSteps });
    }
  }

  /** Remplace le carnet courant affiché dans la carte. */
  setCurrentDiary(diary: TravelDiary | null): void {
    if (!diary) {
      this.currentDiary.set(null);
      this.steps.set([]);
      return;
    }

    this.currentDiary.set({ ...diary, steps: diary.steps ?? [] });
    this.steps.set(diary.steps ?? []);
    this.currentDiaryId.set(diary.id ?? null);
  }

  /** Met à jour l'ID du carnet courant. */
  setCurrentDiaryId(id: number | null): void {
    this.currentDiaryId.set(id);
  }

  /** Remplace la liste complète des carnets chargés. */
  setAllDiaries(diaries: TravelDiary[] | null | undefined): void {
    const safeDiaries = diaries ?? [];
    this.allDiaries.set(safeDiaries);
  }

  /** Définit les carnets visibles (après filtrage éventuel). */
  setVisibleDiaries(diaries: TravelDiary[] | null): void {
    this.visibleDiaries.set(diaries ?? this.allDiaries());
  }

  /** Mémorise l'étape ouverte dans la carte. */
  setOpenedStepId(stepId: number | null): void {
    this.openedStepId.set(stepId);
  }

  /** Mémorise l'étape dont les commentaires sont ouverts. */
  setOpenedCommentStepId(stepId: number | null): void {
    this.openedCommentStepId.set(stepId);
  }

  /** Met à jour la position de la carte. */
  setMapCenterCoords(coords: { lat: number; lng: number } | null): void {
    this.mapCenterCoords.set(coords);
  }

  /**
   * Met à jour l'état des likes pour une étape donnée.
   * Le compteur minimum est borné à zéro pour rester simple.
   */
  updateStepLikeState(stepId: number, likes: number, viewerHasLiked: boolean): void {
    const safeLikes = Math.max(0, Math.round(likes ?? 0));
    const mapStep = (step: Step): Step =>
      step.id === stepId
        ? {
            ...step,
            likes: safeLikes,
            likesCount: safeLikes,
            viewerHasLiked,
          }
        : step;

    this.steps.set(this.steps().map(mapStep));

    const diary = this.currentDiary();
    if (diary) {
      const updatedSteps = (diary.steps ?? []).map(mapStep);
      this.currentDiary.set({ ...diary, steps: updatedSteps });
    }
  }

  /** Vide l'état courant, avec option pour garder les carnets visibles. */
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

  /** Réinitialise complètement le store. */
  reset(): void {
    this.steps.set([]);
    this.currentDiary.set(null);
    this.currentDiaryId.set(null);
    this.allDiaries.set([]);
    this.visibleDiaries.set([]);
    this.openedStepId.set(null);
    this.openedCommentStepId.set(null);
    this.mapCenterCoords.set(null);
    this.shouldOpenCreateModal = false;
    this.requestedEditDiaryId = null;
  }

  /**
   * Retourne une URL de couverture pour un carnet : d'abord le média du carnet,
   * sinon la première image trouvée sur les étapes.
   */
  getDiaryCoverUrl(diary: TravelDiary | null | undefined): string {
    if (!diary) {
      return '';
    }

    const mediaUrl = diary.media?.fileUrl ?? '';
    if (mediaUrl.trim()) {
      return mediaUrl;
    }

    const steps = diary.steps ?? [];
    for (const step of steps) {
      const url = step?.media?.[0]?.fileUrl ?? '';
      if (url.trim()) {
        return url;
      }
    }

    return '';
  }

  /** Retourne la liste des médias d'une étape (tableau vide sinon). */
  getStepMediaList(step: Step | null | undefined): Step['media'] {
    return step?.media ?? [];
  }

  /**
   * Vérifie si un carnet est accessible pour l'utilisateur courant.
   * Un admin a toujours accès, le propriétaire également.
   * Si le carnet est désactivé ou si le propriétaire est bloqué, il est caché.
   */
  isDiaryAccessible(
    diary: TravelDiary | null | undefined,
    options?: { viewerId?: number | null; viewerIsAdmin?: boolean }
  ): boolean {
    if (!diary) {
      return false;
    }

    if (options?.viewerIsAdmin) {
      return true;
    }

    const viewerId = options?.viewerId ?? null;
    const owner = diary.user as { id?: number | null; status?: string | null; enabled?: boolean | null } | null;
    const isOwner = owner?.id != null && owner.id === viewerId;
    if (isOwner) {
      return true;
    }

    if (diary.status === 'DISABLED') {
      return false;
    }

    if (!owner) {
      return true;
    }

    if (owner.enabled === false) {
      return false;
    }

    return owner.status !== 'DISABLED' && owner.status !== 'BLOCKED' && owner.status !== 'INACTIVE';
  }
}
