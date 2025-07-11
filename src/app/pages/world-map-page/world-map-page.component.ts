import { Component } from '@angular/core';
import {
  MapComponent,
  MapDiarySelectedEvent,
  MapInitializedEvent,
  MapStepSelectedEvent,
} from '../../components/Atoms/map/map.component';
import { ProgressBarComponent } from '../../components/Atoms/progress-bar/progress-bar.component';
import { AccordionComponent } from '../../components/Atoms/accordion/accordion.component';
import { AccordionProps } from '../../model/accordion.model';
import { FormsModule } from '@angular/forms';
import { TravelDiary } from '../../model/travelDiary';
import { Step } from '../../model/step';
import { Media } from '../../model/media';
import { CheckboxComponent } from '../../components/checkbox/checkbox.component';

@Component({
  selector: 'app-world-map-page',
  imports: [MapComponent, ProgressBarComponent, AccordionComponent, FormsModule, CheckboxComponent],
  templateUrl: './world-map-page.component.html',
  styleUrl: './world-map-page.component.scss',
})
export class WorldMapPageComponent {
  // Données dynamiques qui seront mises à jour par la map
  steps: (Pick<AccordionProps, 'id' | 'title' | 'startDate' | 'country' | 'isEditing'> & {
    content: string;
    medias: Media[];
  })[] = [];
  staticSteps: (Pick<AccordionProps, 'id' | 'title' | 'startDate' | 'country'> & {
    content: string;
  })[] = [
    {
      id: 1,
      title: 'Arrivé à Madagascar',
      content: 'Me voilà arrivé sur cette Grande et magnifique île...',
      country: 'Aéroport de Nosy Be',
      startDate: new Date('2018-11-08'),
    },
    {
      id: 2,
      title: 'Visite de Hell-ville',
      content: 'Il me fallait visiter cette visite atypique, avec sa triste réputation...',
      country: 'Hell-Ville',
      startDate: new Date('2018-11-12'),
    },
    {
      id: 3,
      title: 'Tour des îles autour de Nosy Be',
      content:
        'Journée mémorable en découvrant les merveilles que la nature nous offre sur cette terre...',
      country: 'Nosy Iranja',
      startDate: new Date('2018-11-15'),
    },
    {
      id: 4,
      title: 'Soirée malgache',
      content:
        "On peut dire que la musique malgache est très festive et entrainante, difficile de tenir le rytme jusqu'au bout de la nuit!",
      country: 'Andilana Beach',
      startDate: new Date('2018-11-06'),
    },
  ];

  openedStepIds: number[] = [];
  completedSteps = 0;
  currentDiary: TravelDiary | null = null;
  allDiaries: TravelDiary[] = [];

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
    console.log('Diary sélectionné:', event.diary.title);
    console.log('Steps du diary:', event.steps);

    this.currentDiary = event.diary;
    this.updateStepsFromDiarySteps(event.steps);

    // Réinitialiser l'état de l'accordion
    this.openedStepIds = [];
    this.completedSteps = 0;
  }

  /**
   * Événement déclenché quand un step est cliqué sur la map
   */
  onStepSelected(event: MapStepSelectedEvent): void {
    console.log('Step sélectionné:', event.step.name, "à l'index", event.stepIndex);

    // Ouvrir automatiquement l'accordion du step sélectionné
    const stepId = event.step.id;
    if (stepId && !this.openedStepIds.includes(stepId)) {
      this.openedStepIds.push(stepId);
      this.completedSteps = this.getProgressFromOpenedSteps();
    }
  }

  /**
   * Convertit les steps d'un diary en format accordion
   */
  private updateStepsFromDiarySteps(steps: Step[]): void {
    this.steps = steps.map((step, index) => ({
      id: step.id,
      title: step.title || `Étape ${index + 1}`,
      content: step.description || 'Aucune description disponible',
      country: step.country || 'Adresse non disponible',
      startDate: step.startDate ? new Date(step.startDate) : new Date(),
      medias: step.medias,
      isEditing: step.isEditing,
    }));
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
    if (isOpen && !this.openedStepIds.includes(stepId)) {
      this.openedStepIds.push(stepId);
    } else if (!isOpen) {
      this.openedStepIds = this.openedStepIds.filter((id) => id !== stepId);
    }

    this.completedSteps = this.getProgressFromOpenedSteps();
  }

  getProgressFromOpenedSteps(): number {
    if (this.openedStepIds.length === 0) return 0;

    console.log(this.openedStepIds);
    // Trouver les index correspondants aux stepIds ouverts
    const openedIndexes = this.openedStepIds
      .map((openedId) => this.steps.findIndex((step) => step.id === openedId))
      .filter((index) => index !== -1);

    console.log(openedIndexes);

    if (openedIndexes.length === 0) return 0;

    const maxOpened = Math.max(...openedIndexes);
    return maxOpened + 1;
  }

  onDeleteSteps(id: number | undefined) {
    this.steps = this.steps.filter((step) => step.id !== id);
  }
}
