import { Component } from '@angular/core';
import { Step } from '../../model/step';
import { TravelDiary } from '../../model/travelDiary';
import {
  MapDiarySelectedEvent,
  MapInitializedEvent,
  MapStepSelectedEvent,
} from '../../components/Atoms/map/map.component';
import { TravelMapLayoutComponent } from '../../components/travel-map-layout/travel-map-layout.component';

@Component({
  selector: 'app-my-travels-page',
  imports: [TravelMapLayoutComponent],
  templateUrl: './my-travels-page.component.html',
  styleUrl: './my-travels-page.component.scss',
})
export class MyTravelsPageComponent {
  // private authService = inject(AuthService); // A créer
  connectedUserId = 1;

  steps: Step[] = [];
  currentDiary: TravelDiary | null = null;
  openedStepId: number | null = null;
  openedCommentStepId: number | null = null;
  completedSteps = 0;
  mapCenterCoords: { lat: number; lng: number } | null = null;
  allDiaries: TravelDiary[] = [];

  onMapInitialized(event: MapInitializedEvent): void {
    this.allDiaries = event.diaries.filter((diary) => diary.user.id === this.connectedUserId);
  }

  onDiarySelected(event: MapDiarySelectedEvent): void {
    this.currentDiary = event.diary;
    this.updateStepsFromDiarySteps(event.steps);
    this.completedSteps = this.getProgressFromOpenedSteps();
  }

  onSelectedStep(event: MapStepSelectedEvent): void {
    this.openedStepId = event.step.id;
    this.completedSteps = this.getProgressFromOpenedSteps();
  }

  onRenitializeDiaries(): void {
    this.currentDiary = null;
    this.steps = [];
  }

  onAccordionToggle(stepId: number | undefined, isOpen: boolean): void {
    this.openedStepId = isOpen && stepId ? stepId : null;
    this.completedSteps = this.getProgressFromOpenedSteps();
  }

  onDeleteSteps(id: number | undefined): void {
    this.steps = this.steps.filter((step) => step.id !== id);
  }

  handleButtonClick(action: string, step: Step): void {
    if (action === 'like') {
      console.log(`Like sur le step ${step.id}`);
    } else if (action === 'comment') {
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

    this.openedStepId = this.steps[0]?.id ?? null;
  }

  private getProgressFromOpenedSteps(): number {
    if (!this.openedStepId) return 0;
    const index = this.steps.findIndex((step) => step.id === this.openedStepId);
    return index !== -1 ? index + 1 : 0;
  }
}
