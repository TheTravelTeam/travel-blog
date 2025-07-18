import { Component, inject } from '@angular/core';
import {
  MapComponent,
  MapDiarySelectedEvent,
  MapInitializedEvent,
  MapStepSelectedEvent,
} from '../../components/Atoms/map/map.component';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TravelMapStateService } from '../../services/travel-map-state.service';

@Component({
  selector: 'app-travel-map-layout-page',
  imports: [RouterOutlet, CommonModule, MapComponent],
  templateUrl: './travel-map-layout-page.component.html',
  styleUrl: './travel-map-layout-page.component.scss',
})
export class TravelMapLayoutPageComponent {
  readonly state = inject(TravelMapStateService);

  onMapInitialized(event: MapInitializedEvent): void {
    this.state.allDiaries.set(event.diaries);
  }

  onDiarySelected(event: MapDiarySelectedEvent): void {
    const current = this.state.currentDiary();
    if (!current || current.id !== event.diary.id) {
      this.state.currentDiary.set(event.diary);
    }

    this.state.steps.set(event.steps);
    this.state.openedStepId.set(event.steps[0]?.id ?? null);
    this.state.panelHeight.set('collapsedDiary');
  }

  onStepSelected(event: MapStepSelectedEvent): void {
    this.state.openedStepId.set(event.step.id);
    this.state.mapCenterCoords.set({
      lat: event.step.latitude ?? 0,
      lng: event.step.longitude ?? 0,
    });
  }

  getProgressFromOpenedSteps(): number {
    console.log('yooooooooooooooooo');
    if (!this.state.openedStepId()) return 0;

    const index = this.state.steps().findIndex((step) => step.id === this.state.openedStepId());
    return index !== -1 ? index + 1 : 0;
  }

  onRenitializeDiaries(): void {
    this.state.reset();
    this.state.panelHeight.set('collapsed');
  }
}
