import { Component, computed, inject, signal, OnInit, OnDestroy, ViewChild } from '@angular/core';
import {
  MapComponent,
  MapDiarySelectedEvent,
  MapInitializedEvent,
  MapStepSelectedEvent,
} from 'components/Organisms/Map/map.component';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TravelMapStateService } from '@service/travel-map-state.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

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
  @ViewChild(MapComponent) private mapComponent?: MapComponent;

  public userId = 1;
  readonly currentRoute = signal(this.router.url);
  readonly isWorldMapOrFilterpage = computed(
    () => this.currentRoute() === '/travels' || /^\/travels\/\d+$/.test(this.currentRoute())
  );
  readonly isMyTravelsPage = computed(() => /^\/travels\/users\/\d+$/.test(this.currentRoute()));

  ngOnInit(): void {
    this.routeSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.handleNavigation(event.urlAfterRedirects ?? event.url);
      });

    this.handleNavigation(this.router.url);
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
    const requestedStepId = this.extractStepIdFromUrl();
    const matchedStep =
      requestedStepId != null
        ? event.steps.find((step) => step.id === requestedStepId) ?? null
        : null;
    const targetedStep = matchedStep ?? event.steps[0] ?? null;

    this.state.openedStepId.set(targetedStep?.id ?? null);

    if (matchedStep) {
      this.state.mapCenterCoords.set(null);
      this.state.panelHeight.set('expanded');
      return;
    }

    this.state.mapCenterCoords.set(null);
    this.state.panelHeight.set('expanded');
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

  private handleNavigation(url: string): void {
    if (!url) {
      return;
    }

    this.currentRoute.set(url);

    const [path, query] = url.split('?');
    const searchParams = new URLSearchParams(query ?? '');
    const hasSearchQuery = (searchParams.get('q') ?? '').trim().length > 0;

    if (!path.startsWith('/travels')) {
      this.state.reset();
      this.state.panelHeight.set('collapsed');
      return;
    }

    if (path === '/travels') {
      if (hasSearchQuery) {
        this.state.panelHeight.set('expanded');
        return;
      }

      this.state.reset();
      this.state.panelHeight.set('collapsed');
      this.mapComponent?.backToDiaries({ skipNavigation: true, skipStateReset: true });
      return;
    }

    if (/^\/travels\/users\/\d+$/.test(path)) {
      this.state.clearCurrentDiarySelection({ preserveVisibleDiaries: true });
      this.state.setVisibleDiaries([]);
      this.state.panelHeight.set('expanded');
      this.mapComponent?.backToDiaries({
        skipNavigation: true,
        skipStateReset: true,
        skipGlobalReload: true,
      });
      return;
    }

    if (/^\/travels\/\d+$/.test(path)) {
      this.state.panelHeight.set('expanded');
    }
  }

  private extractStepIdFromUrl(): number | null {
    const [, query] = this.router.url.split('?');
    if (!query) {
      return null;
    }

    const params = new URLSearchParams(query);
    const raw = params.get('step');
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
