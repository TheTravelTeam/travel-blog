import { Component, inject } from '@angular/core';
import {
  MapComponent,
  MapDiarySelectedEvent,
  MapInitializedEvent,
  MapStepSelectedEvent,
} from '../../components/Atoms/map/map.component';
import { ProgressBarComponent } from '../../components/Atoms/progress-bar/progress-bar.component';
import { AccordionComponent } from '../../components/Atoms/accordion/accordion.component';
import { FormsModule } from '@angular/forms';
import { TravelDiary } from '../../model/travelDiary';
import { Step } from '../../model/step';
import { CheckboxComponent } from '../../components/checkbox/checkbox.component';
import { IconComponent } from '../../components/icon/icon.component';
import { ButtonComponent } from '../../components/Button/button/button.component';
import { CommonModule } from '@angular/common';
import { DividerComponent } from '../../components/divider/divider.component';
import { BreakpointService } from '../../services/breakpoint.service';

@Component({
  selector: 'app-world-map-page',
  imports: [
    MapComponent,
    ProgressBarComponent,
    AccordionComponent,
    FormsModule,
    CheckboxComponent,
    IconComponent,
    ButtonComponent,
    CommonModule,
    DividerComponent,
  ],
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
  panelHeight: 'collapsed' | 'expanded' | 'collapsedDiary' = 'collapsed';

  private breakpointService = inject(BreakpointService);
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  togglePanel() {
    if (!this.currentDiary) {
      // Si pas de diary, toggle simple entre collapsed/expanded
      this.panelHeight = this.panelHeight === 'collapsed' ? 'expanded' : 'collapsed';
      return;
    }

    // Si diary présent, logique spéciale à 3 états
    switch (this.panelHeight) {
      case 'collapsed':
        this.panelHeight = 'expanded';
        break;
      case 'expanded':
        this.panelHeight = 'collapsedDiary';
        break;
      case 'collapsedDiary':
        this.panelHeight = 'expanded';
        break;
      default:
        this.panelHeight = 'collapsed';
        break;
    }
  }

  get totalStepCount(): number {
    return this.steps.length;
  }

  /**
   * Événement déclenché quand la map est initialisée avec tous les diaries
   */
  onMapInitialized(event: MapInitializedEvent): void {
    console.log('Map initialisée avec', event.diaries.length, 'diaries');
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

    if (this.isTabletOrMobile()) {
      this.panelHeight = 'collapsedDiary';
    } else {
      this.panelHeight = 'expanded'; // Optionnel : comportement desktop
    }
  }

  /**
   * Événement déclenché quand un step est cliqué sur la map
   */
  onStepSelected(event: MapStepSelectedEvent): void {
    console.log('Step sélectionné:', event.step.title, "à l'index", event.stepIndex);
    const stepId = event.step.id;
    this.openedStepId = stepId;
    this.completedSteps = this.getProgressFromOpenedSteps();
  }

  onRenitializeDiaries(): void {
    this.currentDiary = null;
    this.steps = [];
    this.panelHeight = 'collapsed';
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
      console.log('yo');
      this.openedStepId = steps[0].id;
      console.log('yo2', this.openedStepId);
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

  getCommentLabel(step: Step) {
    const count = step.comments?.length ?? 0;
    if (count === 1) {
      return '1 commentaire';
    } else if (count > 1) {
      return `${count} commentaires`;
    } else {
      return 'commentaire';
    }
  }

  handleButtonClick(action: string, step: Step): void {
    if (action === 'like') {
      console.log(`Step ${step.id} liké ! Total : ${step.likes}`);
      // Logique d'ajout de like dans le step -- Si pas déjà aimé en fonction de l'user
    } else if (action === 'comment') {
      console.log(`Afficher les commentaires du step ${step.id}`);
      // Tu peux ici gérer l'ouverture d'une section commentaires ou autre
      console.log(this.openedCommentStepId);
      this.openedCommentStepId = this.openedCommentStepId === step.id ? null : step.id;
    }
  }

  scrollMediaContainer(stepId: number, direction: 'left' | 'right') {
    // Trouver le container avec querySelector
    const container = document.querySelector<HTMLDivElement>(
      `.step__media__container[data-id="${stepId}"]`
    );

    if (!container) return;

    const scrollAmount = 200; // pixels à scroller

    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
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
