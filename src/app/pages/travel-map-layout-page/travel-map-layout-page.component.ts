import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import {
  MapComponent,
  MapDiarySelectedEvent,
  MapInitializedEvent,
  MapStepSelectedEvent,
} from '../../components/Atoms/map/map.component';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { TravelMapStateService } from '../../services/travel-map-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-travel-map-layout-page',
  imports: [RouterOutlet, CommonModule, MapComponent],
  templateUrl: './travel-map-layout-page.component.html',
  styleUrl: './travel-map-layout-page.component.scss',
})
export class TravelMapLayoutPageComponent implements OnInit, OnDestroy {
  readonly state = inject(TravelMapStateService);
  private router = inject(Router);
  private routeSub?: Subscription;

  public userId = 1;
  readonly currentRoute = signal(this.router.url);
  readonly isWorldMapOrFilterpage = computed(
    () => this.currentRoute() === '/travels' || /^\/travels\/\d+$/.test(this.currentRoute())
  );
  readonly isMyTravelsPage = computed(() => /^\/travels\/users\/\d+$/.test(this.currentRoute()));

  ngOnInit(): void {
    this.routeSub = this.router.events.subscribe(() => {
      this.currentRoute.set(this.router.url);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

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

  onRenitializeDiaries(): void {
    this.state.reset();
    this.state.panelHeight.set('collapsed');
  }
}
