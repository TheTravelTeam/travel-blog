import { Component, inject } from '@angular/core';
import {
  MapDiarySelectedEvent,
  MapInitializedEvent,
  MapStepSelectedEvent,
} from '../../components/Atoms/map/map.component';
import { FormsModule } from '@angular/forms';
import { TravelDiary } from '../../model/travelDiary';
import { Step } from '../../model/step';
import { CommonModule } from '@angular/common';
import { BreakpointService } from '../../services/breakpoint.service';
import { TravelMapLayoutComponent } from '../../components/travel-map-layout/travel-map-layout.component';

@Component({
  selector: 'app-world-map-page',
  imports: [FormsModule, CommonModule, TravelMapLayoutComponent],
  templateUrl: './world-map-page.component.html',
  styleUrl: './world-map-page.component.scss',
})
export class WorldMapPageComponent {
  // Données dynamiques qui seront mises à jour par la map
  steps: Step[] = [];
  currentDiary: TravelDiary | null = null;
  allDiaries: TravelDiary[] = [];
  openedCommentStepId: number | null = null;
  openedStepId: number | null = null;
  completedSteps = 0;
  mapCenterCoords: { lat: number; lng: number } | null = null;

  private breakpointService = inject(BreakpointService);
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  /**
   * Événement déclenché quand la map est initialisée avec tous les diaries
   */
  onMapInitialized(event: MapInitializedEvent): void {
    this.allDiaries = event.diaries;

    // Optionnel : afficher tous les diaries ou garder les données statiques
    // this.updateStepsFromDiaries(event.diaries);
  }

  /**
   * Événement déclenché quand un diary est sélectionné sur la map
   */
  onDiarySelected(event: MapDiarySelectedEvent): void {
    this.currentDiary = event.diary;
    this.updateStepsFromDiarySteps(event.steps);
    // Réinitialiser progression
    this.completedSteps = this.getProgressFromOpenedSteps();
  }

  /**
   * Événement déclenché quand un step est cliqué sur la map
   */
  onStepSelected(event: MapStepSelectedEvent): void {
    const stepId = event.step.id;
    this.openedStepId = stepId;
    this.completedSteps = this.getProgressFromOpenedSteps();
  }

  onRenitializeDiaries(): void {
    this.currentDiary = null;
    this.steps = [];
  }

  /**
   * Convertit les steps d'un diary en format accordion
   */
  private updateStepsFromDiarySteps(steps: Step[]): void {
    this.steps = steps.map((step, index) => ({
      id: step.id,
      title: step.title || `Étape ${index + 1}`,
      description: step.description || 'Aucune description disponible',
      country: step.country || 'Adresse non disponible',
      startDate: step.startDate ? new Date(step.startDate) : new Date(),
      medias: step.medias,
      isEditing: step.isEditing,
      comments: step.comments,
      latitude: step.latitude ?? 0,
      longitude: step.longitude ?? 0,
      likes: step.likes,
    }));

    this.openFirstStep(this.steps);
  }

  private openFirstStep(steps: Step[]) {
    // Ouvrir directement le premier step s'il existe
    if (steps.length > 0) {
      this.openedStepId = steps[0].id;
    } else {
      this.openedStepId = null;
    }
  }

  /**
   * Convertit tous les diaries en format accordion (optionnel)
   */
  // private updateStepsFromDiaries(diaries: TravelDiary[]): void {
  //   this.steps = diaries.map((diary, index) => ({
  //     id: diary.id,
  //     title: diary.title || `Diary ${index + 1}`,
  //     content: diary.description || 'Aucune description disponible',
  //     subTitle: `${diary.latitude.toFixed(4)}, ${diary.longitude.toFixed(4)}`,
  //     date: diary.createdAt ? new Date(diary.createdAt) : new Date(),
  //   }));
  // }

  onAccordionToggle(stepId: number | undefined, isOpen: boolean) {
    if (!stepId) return;
    if (isOpen) {
      this.openedStepId = stepId; // ✅ Ferme tous les autres, ouvre celui-ci
    } else {
      this.openedStepId = null; // ✅ Ferme tout
    }

    this.completedSteps = this.getProgressFromOpenedSteps();
  }

  getProgressFromOpenedSteps(): number {
    if (!this.openedStepId) return 0;

    const index = this.steps.findIndex((step) => step.id === this.openedStepId);
    return index !== -1 ? index + 1 : 0;
  }

  onDeleteSteps(id: number | undefined) {
    this.steps = this.steps.filter((step) => step.id !== id);
  }

  handleButtonClick(action: string, step: Step): void {
    if (action === 'like') {
      console.log(`Step ${step.id} liké ! Total : ${step.likes}`);
      // Logique d'ajout de like dans le step -- Si pas déjà aimé en fonction de l'user
    } else if (action === 'comment') {
      console.log(`Afficher les commentaires du step ${step.id}`);
      // Gérer l'ouverture d'une section commentaires ou autre
      this.openedCommentStepId = this.openedCommentStepId === step.id ? null : step.id;
    }
  }

  onStepClicked(stepId: number) {
    const step = this.steps.find((step) => step.id === stepId);
    if (step) {
      this.mapCenterCoords = {
        lat: step.latitude,
        lng: step.longitude,
      };
    }
  }
}
