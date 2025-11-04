import { computed, effect } from '@angular/core';
// Import Angular
import {
  Component,
  AfterViewInit,
  inject,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ViewContainerRef,
  EnvironmentInjector,
  ComponentRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';

// Import Leaflet
import * as L from 'leaflet';

// Import services
import { StepService } from '@service/step.service';

// Types
import { CommonModule } from '@angular/common';
import { MapConfig, mapConfigDefault } from '@model/map.model';
import { TravelDiary } from '@model/travel-diary.model';
import { Step } from '@model/step.model';
import { User } from '@model/user.model';
import { Media } from '@model/media.model';
import { AvatarComponent } from 'components/Atoms/avatar/avatar.component';
import { BreakpointService } from '@service/breakpoint.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { TravelMapStateService } from '@service/travel-map-state.service';
import { AuthService } from '@service/auth.service';
import { UserService } from '@service/user.service';
import { take } from 'rxjs/operators';

// Interface pour les événements
export interface MapDiarySelectedEvent {
  diary: TravelDiary;
  steps: Step[];
}

export interface MapStepSelectedEvent {
  step: Step;
  stepIndex: number;
}

export interface MapInitializedEvent {
  diaries: TravelDiary[];
}

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  imports: [CommonModule],
  styleUrl: './map.component.scss',
})
export class MapComponent implements AfterViewInit, OnChanges {
  @ViewChild('markerContainer', { read: ViewContainerRef }) markerContainer!: ViewContainerRef;

  constructor() {
    effect(() => {
      const diaryId = this.state.currentDiaryId();
      if (diaryId && this.map) {
        this.currentDiaryId = diaryId;
        this.loadStepsForCurrentDiary();
      }
    });

    effect(() => {
      const diaries = this.state.visibleDiaries();
      if (!this.map || !this.diaryMarkersLayer) {
        return;
      }
      this.renderDiaryMarkers(diaries);
    });
  }

  private readonly stepService = inject(StepService);
  private readonly breakpointService = inject(BreakpointService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  readonly state = inject(TravelMapStateService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly environmentInjector = inject(EnvironmentInjector);

  private map!: L.Map;
  private diaryMarkersLayer: L.LayerGroup | null = null;
  private currentDiaryId: number | null = null;

  @Input() viewMode: MapConfig['modeView'] = mapConfigDefault['modeView'];
  @Input() zoomLevel: MapConfig['zoomLevel'] = mapConfigDefault['zoomLevel'];
  @Input() centerLat: MapConfig['centerLat'] = mapConfigDefault['centerLat'];
  @Input() centerLng: MapConfig['centerLng'] = mapConfigDefault['centerLng'];
  @Input() centerOnStep: { lat: number; lng: number } | null = null;

  // Événements à émettre vers le parent
  @Output() mapInitialized = new EventEmitter<MapInitializedEvent>();
  @Output() diarySelected = new EventEmitter<MapDiarySelectedEvent>();
  @Output() stepSelected = new EventEmitter<MapStepSelectedEvent>();
  @Output() renitializedDiaries = new EventEmitter();

  readonly isTabletOrMobile = this.breakpointService.isMobileOrTablet;
  readonly isMobile = this.breakpointService.isMobile;

  readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? null);

  ngAfterViewInit(): void {
    this.initMap();

    if (this.viewMode && !this.state.currentDiaryId()) {
      this.loadAllDiaries();
    }

    // 💡 Si currentDiaryId est déjà là, on recharge (permet de déclencher l’effet ci-dessus)
    if (this.state.currentDiaryId()) {
      this.currentDiaryId = this.state.currentDiaryId();
      this.loadStepsForCurrentDiary(); // ce sera ignoré si déjà appelé par l'effet
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['centerOnStep'] && this.centerOnStep) {
      const { lat, lng } = this.centerOnStep;
      if (this.isTabletOrMobile()) {
        const zoom = this.map.getZoom();
        const point = this.map.project([lat, lng], zoom);

        // Décalage vers le haut (en pixels). 150px est un bon point de départ
        const offsetPoint = L.point(point.x, point.y + 250);
        const offsetLatLng = this.map.unproject(offsetPoint, zoom);

        this.map.flyTo(offsetLatLng, zoom, {
          animate: true,
          duration: 1.5,
        });
      } else {
        this.map.flyTo([this.centerOnStep.lat, this.centerOnStep.lng], 12, {
          animate: true,
          duration: 1.5,
        });
      }
    }
  }

  // get showBackButton(): boolean {
  //   return !!this.state.currentDiaryId();
  // }

  /**
   * Initialise la carte et configure les événements
   */
  private initMap(): void {
    this.map = L.map('map', {
      minZoom: 4,
      maxZoom: 18,
      maxBounds: [
        [-85, -180],
        [85, 180],
      ],
      maxBoundsViscosity: 1.0,
      worldCopyJump: false,
    }).setView([this.centerLat, this.centerLng], this.zoomLevel);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri' }
    ).addTo(this.map);

    this.diaryMarkersLayer = L.layerGroup().addTo(this.map);

    this.tryLocateUser();
  }

  /**
   * Tente de centrer la carte sur la position de l'utilisateur.
   * L'échec est silencieux pour éviter d'interrompre l'expérience.
   */
  private tryLocateUser(): void {
    if (!navigator.geolocation || !this.map) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLocation = L.latLng(pos.coords.latitude, pos.coords.longitude);
        const icon = L.divIcon({
          html: '<div class="white-circle"></div>',
          className: '',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        L.marker(userLocation, { icon }).addTo(this.map!).bindPopup('Vous êtes ici');
        this.map!.flyTo(userLocation, 10, { animate: true, duration: 1.5 });
      },
      () => {
        /* ignore permission refusals */
      }
    );
  }

  /**
   * Charger tous les diaries avec leurs marker
   */
  private loadAllDiaries(): void {
    this.stepService.getAllDiaries().pipe(take(1)).subscribe({
      next: (diaries) => {
        const accessibleDiaries = (diaries ?? []).filter((diary) =>
          this.state.isDiaryAccessible(diary, {
            viewerId: this.currentUserId(),
            viewerIsAdmin: this.userService.isCurrentUserAdmin(),
          })
        );

        this.state.setAllDiaries(accessibleDiaries);
        this.state.setVisibleDiaries(accessibleDiaries);
        this.renderDiaryMarkers(accessibleDiaries);
        this.mapInitialized.emit({ diaries: accessibleDiaries });
      },
      error: () => this.handleDiaryLoadFailure(),
    });
  }

  /**
   * (Re)renders diary markers based on the currently visible diaries list.
   * @param diaries Diaries that should appear on the map.
   */
  private renderDiaryMarkers(diaries: TravelDiary[]): void {
    const layer = this.diaryMarkersLayer;
    if (!layer || !this.map) {
      return;
    }

    layer.clearLayers();

    diaries.forEach((diary) => {
      const fileUrl = this.state.getDiaryCoverUrl(diary) || '/icon/logo.svg';
      const html = `
        <div class="custom-marker">
          <img src="${fileUrl}" class="size-md" alt="avatar" />
        </div>
      `;

      const icon = L.divIcon({
        html,
        className: '',
        iconSize: [50, 50],
        iconAnchor: [25, 25],
      });

      const marker = L.marker([diary.latitude, diary.longitude], { icon }).addTo(layer);

      marker.on('click', () => {
        this.currentDiaryId = diary.id;
        this.state.setCurrentDiaryId(diary.id);
        this.router.navigate(['/travels', diary.id]).catch(() => undefined);
        this.loadStepsForCurrentDiary();
      });
    });
  }

  /**
   * Charger steps d'un diary et tracer les lignes
   */
  private loadStepsForCurrentDiary(): void {
    const diaryId = this.currentDiaryId;
    if (!diaryId) {
      return;
    }

    this.stepService
      .getDiaryWithSteps(diaryId)
      .pipe(take(1))
      .subscribe({
        next: (diary) => {
          if (
            !this.state.isDiaryAccessible(diary, {
              viewerId: this.currentUserId(),
              viewerIsAdmin: this.userService.isCurrentUserAdmin(),
            })
          ) {

            this.handleDiaryAccessDenied();
            return;
          }

          this.diaryMarkersLayer?.clearLayers();
          this.clearMapLayers();

          const steps: Step[] = Array.isArray(diary.steps) ? diary.steps : [];
          const authorLabel = this.getDiaryAuthorLabel(diary);

          this.diarySelected.emit({ diary, steps });

          steps.forEach((step, index) => {
            const medias = this.state.getStepMediaList(step);
            this.addMarkerWithComponent(
              step.latitude,
              step.longitude,
              medias,
              authorLabel,
              step,
              index
            );
          });

          if (!steps.length) {
            return;
          }

          const latlngs = steps.map((s) => L.latLng(s.latitude, s.longitude));

          const [firstStep] = steps;
          if (firstStep && this.map) {
            this.map.flyTo([firstStep.latitude, firstStep.longitude], 10, {
              animate: true,
              duration: 1.5,
            });
          }

          L.polyline(latlngs, {
            color: 'deepskyblue',
            weight: 4,
            opacity: 0.8,
          }).addTo(this.map);
        },
        error: () => {
          this.handleDiaryLoadFailure();
        },
      });
  }

  /**
   * Crée un marker avec un vrai composant Angular dedans
   */
  private addMarkerWithComponent(
    lat: number,
    lng: number,
    medias: Media[],
    authorLabel: string,
    step?: Step,
    stepIndex?: number
  ): void {
    const container = document.createElement('div');
    container.classList.add('custom-marker');

    const compRef: ComponentRef<AvatarComponent> = this.markerContainer.createComponent(
      AvatarComponent,
      {
        environmentInjector: this.environmentInjector,
      }
    );

    if (medias && medias.length > 0) {
      compRef.setInput('picture', medias[0].fileUrl);
    } else {
      compRef.setInput('label', authorLabel);
    }

    compRef.setInput('color', 'mint');
    compRef.changeDetectorRef.detectChanges();

    const html = compRef.location.nativeElement.outerHTML;

    const icon = L.divIcon({
      html,
      className: '',
      iconSize: [50, 50],
      iconAnchor: [25, 25],
    });

    const marker = L.marker([lat, lng], { icon }).addTo(this.map);

    // Ajouter l'événement de clic sur le marker si c'est un step
    if (step && stepIndex !== undefined) {
      marker.on('click', () => {
        this.stepSelected.emit({ step, stepIndex });
      });
    }

    compRef.destroy();
  }

  /** Retourne l'objet utilisateur lorsqu'il est présent dans la payload du carnet. */
  private getDiaryOwner(diary: TravelDiary): User | null {
    const owner = diary.user;
    if (typeof owner === 'object' && owner !== null) {
      return owner;
    }
    return null;
  }

  /**
   * Détermine le libellé auteur à afficher sur un marker.
   * Cherche d'abord le pseudo de l'objet utilisateur, puis un champ `author` embarqué,
   * et finit sur un libellé générique.
   */
  private getDiaryAuthorLabel(diary: TravelDiary): string {
    const owner = this.getDiaryOwner(diary);
    const pseudo = owner?.pseudo?.trim();
    if (pseudo) {
      return pseudo;
    }

    const inlineAuthor = (diary as { author?: string | null }).author?.trim();
    if (inlineAuthor) {
      return inlineAuthor;
    }

    return 'Voyageur anonyme';
  }

  /**
   * Retourne sur la vue générale des carnets.
   * Les options sont conservées pour compatibilité avec les appels existants.
   */
  public backToDiaries(options?: {
    skipNavigation?: boolean;
    skipStateReset?: boolean;
    skipGlobalReload?: boolean;
  }): void {
    if (!this.map) {
      return;
    }

    const skipNavigation = options?.skipNavigation ?? false;
    const skipStateReset = options?.skipStateReset ?? false;
    const skipGlobalReload = options?.skipGlobalReload ?? false;

    this.currentDiaryId = null;
    this.viewMode = true;

    this.diaryMarkersLayer?.clearLayers();
    this.clearMapLayers();

    const visibleDiaries = this.state.visibleDiaries();
    if (visibleDiaries.length) {
      this.renderDiaryMarkers(visibleDiaries);
      this.mapInitialized.emit({ diaries: visibleDiaries });
    } else if (!skipGlobalReload) {
      this.loadAllDiaries();
    }

    this.tryLocateUser();

    if (!skipStateReset) {
      this.renitializedDiaries.emit();
    }

    if (!skipNavigation) {
      if (this.hasBrowserHistory()) {
        this.location.back();
      } else {
        this.router.navigate(['/travels']).catch(() => undefined);
      }
    }
  }

  private hasBrowserHistory(): boolean {
    return typeof window !== 'undefined' && window.history.length > 1;
  }

  /**
   * Clean tous les marqueurs et tous les tracés
   */
  private clearMapLayers(): void {
    if (!this.map) {
      return;
    }

    this.map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        this.map.removeLayer(layer);
      }
    });
  }

  private handleDiaryAccessDenied(): void {
    this.backToDiaries({ skipNavigation: true, skipStateReset: true });
  }

  private handleDiaryLoadFailure(): void {
    this.backToDiaries({ skipNavigation: true, skipStateReset: true });
  }
}
