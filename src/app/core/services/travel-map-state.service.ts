import { computed, Injectable, signal } from '@angular/core';
import { Step } from '@model/step.model';
import { TravelDiary } from '@model/travel-diary.model';
import { Media } from '@model/media.model';

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

  // ✅ Méthodes utilitaires
  setSteps(steps: Step[]) {
    this.steps.set(steps);
  }

  setCurrentDiary(diary: TravelDiary | null) {
    this.currentDiary.set(diary);
  }

  setCurrentDiaryId(id: number | null) {
    this.currentDiaryId.set(id);
  }

  setAllDiaries(diaries: TravelDiary[]) {
    this.allDiaries.set(diaries);
  }

  setOpenedStepId(stepId: number | null) {
    this.openedStepId.set(stepId);
    // this.updateProgress();
  }

  setOpenedCommentStepId(stepId: number | null) {
    this.openedCommentStepId.set(stepId);
  }

  setMapCenterCoords(coords: { lat: number; lng: number } | null) {
    this.mapCenterCoords.set(coords);
  }

  reset() {
    this.steps.set([]);
    this.currentDiary.set(null);
    this.openedStepId.set(null);
    this.openedCommentStepId.set(null);
    this.mapCenterCoords.set(null);
    // this.completedSteps.set(0);
  }

  /**
   * Retourne l'URL du média principal d'un carnet (ou le premier média d'étape en fallback).
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

  /** Agrège les médias d'une étape. */
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

  /** Retourne la première URL exploitable depuis une structure hétérogène. */
  private pickFirstUrl(source: Media | Media[] | null | undefined): string | null {
    if (!source) {
      return null;
    }

    const medias = Array.isArray(source) ? source : [source];
    const media = medias.find((item) => typeof item?.fileUrl === 'string' && item.fileUrl.trim());
    return media?.fileUrl ?? null;
  }
}
