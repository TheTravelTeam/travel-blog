import { computed, Injectable, signal } from '@angular/core';
import { Step } from '../model/step';
import { TravelDiary } from '../model/travelDiary';

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

  // private updateProgress() {
  //   const currentStepId = this.openedStepId();
  //   const index = this.steps().findIndex((step) => step.id === currentStepId);
  //   this.completedSteps.set(index !== -1 ? index + 1 : 0);
  // }

  // getProgressFromOpenedSteps(): number {
  //   if (!this.openedStepId()) return 0;

  //   const index = this.steps().findIndex((step) => step.id === this.openedStepId());
  //   return index !== -1 ? index + 1 : 0;
  // }
}
