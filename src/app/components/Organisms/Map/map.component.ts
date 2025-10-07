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
import { HttpClient } from '@angular/common/http';

// Import Leaflet
import * as L from 'leaflet';

// Import services
import { StepService } from '@service/step.service';

// Types
import { NominatimResponse } from '@model/nominatim-reponse.model';
import { CommonModule } from '@angular/common';
import { MapConfig, mapConfigDefault } from '@model/map.model';
import { TravelDiary } from '@model/travel-diary.model';
import { Step } from '@model/step.model';
import { User } from '@model/user.model';
import { CreateDiaryDto } from '@dto/create-diary.dto';
import { Media } from '@model/media.model';
import { CreateStepDto } from '@dto/create-step.dto';
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

  constructor(private injector: EnvironmentInjector) {
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

  private http = inject(HttpClient);
  private stepService = inject(StepService);
  private breakpointService = inject(BreakpointService);
  private router = inject(Router);
  private readonly location = inject(Location);
  public state = inject(TravelMapStateService);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  private map!: L.Map;
  private diaryMarkersLayer: L.LayerGroup | null = null;
  public currentDiaryId: number | null = null;
  public currentUser: User | null = null;
  public userLoc: L.LatLng | null = null;
  public isFirstCall = true;

  @Input() viewMode: MapConfig['modeView'] = mapConfigDefault['modeView'];
  @Input() isDiary: MapConfig['isDiary'] = mapConfigDefault['isDiary'];
  @Input() isStep: MapConfig['isStep'] = mapConfigDefault['isStep'];
  @Input() zoomLevel: MapConfig['zoomLevel'] = mapConfigDefault['zoomLevel'];
  @Input() centerLat: MapConfig['centerLat'] = mapConfigDefault['centerLat'];
  @Input() centerLng: MapConfig['centerLng'] = mapConfigDefault['centerLng'];
  @Input() centerOnStep: { lat: number; lng: number } | null = null;

  // Événements à émettre vers le parent
  @Output() mapInitialized = new EventEmitter<MapInitializedEvent>();
  @Output() diarySelected = new EventEmitter<MapDiarySelectedEvent>();
  @Output() stepSelected = new EventEmitter<MapStepSelectedEvent>();
  @Output() renitializedDiaries = new EventEmitter();

  private lastPoint: L.LatLng | null = null;
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;
  isMobile = this.breakpointService.isMobile;

  public currentUserId = computed(() => this.authService.currentUser()?.id ?? null);

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

    this.getGeolocalisation();
    this.map.on('click', (e: L.LeafletMouseEvent) => this.handleCreateOnMapClick(e));
  }

  /**
   * Gère la géolocalisation
   */
  private getGeolocalisation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.userLoc = L.latLng(pos.coords.latitude, pos.coords.longitude);

          const customIcon = L.divIcon({
            html: `<div class="white-circle"></div>`,
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          });

          L.marker(this.userLoc, { icon: customIcon })
            .addTo(this.map)
            .bindPopup('Vous êtes ici')
            .openPopup();

          if (this.isFirstCall && !this.currentDiaryId) {
            this.map.setView(this.userLoc, 10);
            this.isFirstCall = !this.isFirstCall;
          }
        },
        (error) => console.warn('Géolocalisation refusée', error)
      );
    }
  }

  /**
   * Gérer les clics sur la carte
   */
  private handleCreateOnMapClick(e: L.LeafletMouseEvent): void {
    const { lat, lng } = e.latlng;
    const coordStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    const currentUserId = this.currentUserId();

    // Affiche les coordonnées dans un popup
    L.popup({ closeOnClick: true, autoClose: true })
      .setLatLng([lat, lng])
      .setContent(`<b>GPS</b><br>${coordStr}`)
      .openOn(this.map);

    if (this.viewMode) return;

    if (this.userService.isCurrentUserDisabled()) {
      console.warn('Création de contenu bloquée : utilisateur désactivé.');
      return;
    }

    if (this.isDiary) {
      const newDiary: CreateDiaryDto = {
        title: `Diary ${Date.now()}`,
        description: 'Diary ajouté depuis la carte',
        latitude: lat,
        longitude: lng,
        media: {
          fileUrl:
            'https://www.echosciences-grenoble.fr/uploads/article/image/attachment/1005418938/xl_lens-1209823_1920.jpg',
          mediaType: 'PHOTO',
        },
        user: currentUserId,
        isPrivate: false,
        isPublished: true,
        status: 'DRAFT',
        canComment: true,
        steps: [],
      };

      this.stepService.addDiary(newDiary).subscribe((diary) => {
        L.marker([lat, lng]).addTo(this.map).bindPopup(diary.title).openPopup();
        this.currentDiaryId = diary.id;
        this.loadStepsForCurrentDiary();
        this.isStep = true;
        this.isDiary = false;
      });
    }

    if (this.isStep && this.currentDiaryId) {
      if (this.lastPoint) {
        const newLatLng = L.latLng(lat, lng);
        L.polyline([this.lastPoint, newLatLng], {
          color: 'white',
          weight: 2,
          dashArray: '6,10',
          opacity: 0.9,
        }).addTo(this.map);
        this.lastPoint = newLatLng;
      } else {
        this.lastPoint = L.latLng(lat, lng);
      }

      this.addMarker(lat, lng);
      this.fetchAddress(lat, lng);
      this.saveStep(lat, lng);
    }
  }

  /**
   * Charger tous les diaries avec leurs marker
   */
  private loadAllDiaries(): void {
    this.stepService.getAllDiaries().subscribe((diaries) => {
      const source = Array.isArray(diaries) ? diaries : [];
      const accessibleDiaries = source.filter((diary) =>
        this.state.isDiaryAccessible(diary, {
          viewerId: this.currentUserId(),
          viewerIsAdmin: this.userService.isCurrentUserAdmin(),
        })
      );

      this.state.setAllDiaries(accessibleDiaries);
      this.mapInitialized.emit({ diaries: accessibleDiaries });
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
        layer.clearLayers();
        this.map.eachLayer((layer) => {
          if (layer instanceof L.Polyline || layer instanceof L.Marker) {
            this.map.removeLayer(layer);
          }
        });
        this.router.navigate(['/travels', diary.id]).catch(() => undefined);
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
            console.warn('Diary access denied: diary or owner disabled.', diaryId);
            this.handleDiaryAccessDenied();
            return;
          }

          this.clearMapLayers();

          const steps: Step[] = Array.isArray(diary.steps) ? diary.steps : [];
          const currentUser: User = diary.user;

          this.diarySelected.emit({ diary, steps });

          steps.forEach((step, index) => {
            const medias = this.state.getStepMediaList(step);
            this.addMarkerWithComponent(
              step.latitude,
              step.longitude,
              medias,
              currentUser,
              step,
              index
            );
          });

          if (!steps.length) {
            return;
          }

          const latlngs = steps.map((s) => L.latLng(s.latitude, s.longitude));

          if (this.isTabletOrMobile()) {
            const zoom = this.map.getZoom();
            const point = this.map.project([steps[0].latitude, steps[0].longitude], zoom);

            // Décalage vers le haut (en pixels). 150px est un bon point de départ
            const offsetPoint = L.point(point.x, point.y + 250);
            const offsetLatLng = this.map.unproject(offsetPoint, zoom);

            this.map.flyTo(offsetLatLng, zoom, {
              animate: true,
              duration: 1.5,
            });
          } else {
            this.map.flyTo([steps[0].latitude, steps[0].longitude], 10, {
              animate: true,
              duration: 1.5,
            });
          }

          L.polyline(latlngs, {
            color: 'deepskyblue',
            weight: 4,
            opacity: 0.8,
          }).addTo(this.map);

          this.lastPoint = latlngs[latlngs.length - 1];
        },
        error: (error) => {
          console.error('Failed to load diary, returning to overview.', error);
          this.handleDiaryLoadFailure();
        },
      });
  }

  /**
   * Ajouter marker -- fonction par défaut
   */
  private addMarker(lat: number, lng: number): void {
    L.marker([lat, lng]).addTo(this.map);
  }

  /**
   * Crée un marker avec un vrai composant Angular dedans
   */
  private addMarkerWithComponent(
    lat: number,
    lng: number,
    medias: Media[],
    currentUser: User,
    step?: Step,
    stepIndex?: number
  ): void {
    const container = document.createElement('div');
    container.classList.add('custom-marker');

    const compRef: ComponentRef<AvatarComponent> = this.markerContainer.createComponent(
      AvatarComponent,
      {
        environmentInjector: this.injector,
      }
    );

    if (medias && medias.length > 0) {
      compRef.setInput('picture', medias[0].fileUrl);
    } else {
      const label = typeof currentUser?.pseudo === 'string' ? currentUser.pseudo.trim() : '';
      compRef.setInput('label', label);
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

  /**
   * Chercher adresse et retourne l'adresse du clique
   */
  private fetchAddress(lat: number, lng: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    this.http.get<NominatimResponse>(url).subscribe((data) => {
      const address = data.display_name || 'Adresse non trouvée';
      L.popup().setLatLng([lat, lng]).setContent(address).openOn(this.map);
    });
  }

  /**
   * Sauver step
   */
  /**
   * Persists a quick step generated from the map directly.
   * @param lat Latitude clicked by the user.
   * @param lng Longitude clicked by the user.
   */
  private saveStep(lat: number, lng: number): void {
    if (this.userService.isCurrentUserDisabled()) {
      console.warn('Création de contenu bloquée : utilisateur désactivé.');
      return;
    }

    const newStep: CreateStepDto = {
      title: `Step ${Date.now()}`,
      description: 'Ajouté depuis carte',
      latitude: lat,
      longitude: lng,
      travelDiaryId: this.currentDiaryId!,
      status: 'IN_PROGRESS',
      themeIds: [],
    };

    this.stepService.addStepToTravel(this.currentDiaryId!, newStep).subscribe({
      next: (createdStep) => {
        console.info('✅ Step sauvegardé', createdStep);
        this.loadStepsForCurrentDiary();
      },
      error: (err) => {
        console.error('❌ Impossible de sauvegarder le step', err);
      },
    });
  }

  /**
   * Retour sur les journaux
   */
  public backToDiaries(options?: {
    skipNavigation?: boolean;
    skipStateReset?: boolean;
    skipGlobalReload?: boolean;
  }): void {
    const skipNavigation = options?.skipNavigation ?? false;
    const skipStateReset = options?.skipStateReset ?? false;
    const skipGlobalReload = options?.skipGlobalReload ?? false;

    this.resetMapToDiaryOverview({ skipGlobalReload });

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
    this.map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        this.map.removeLayer(layer);
      }
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri' }
    ).addTo(this.map);
  }

  private resetMapToDiaryOverview(options?: { skipGlobalReload?: boolean }): void {
    const skipGlobalReload = options?.skipGlobalReload ?? false;

    if (!this.map) {
      return;
    }

    this.diaryMarkersLayer?.clearLayers();
    this.clearMapLayers();
    this.viewMode = true;
    this.currentDiaryId = null;
    this.lastPoint = null;

    const diaries = this.state.visibleDiaries();
    if (Array.isArray(diaries) && diaries.length) {
      this.renderDiaryMarkers(diaries);
      this.mapInitialized.emit({ diaries });
    } else if (!skipGlobalReload) {
      this.loadAllDiaries();
    }

    if (navigator.geolocation) {
      this.getGeolocalisation();
      if (this.userLoc) {
        this.map.flyTo(this.userLoc, 10, {
          animate: true,
          duration: 1.5,
        });
      }
    } else {
      this.map.flyTo([48.86, 2.333], 10, {
        animate: true,
        duration: 1.5,
      });
    }
  }

  /** Navigates back to the overview when a diary cannot be displayed. */
  private handleDiaryAccessDenied(): void {
    this.navigateBackToDiaryOverview();
  }

  /** Resets the view after an unexpected diary loading failure. */
  private handleDiaryLoadFailure(): void {
    this.navigateBackToDiaryOverview();
  }

  /** Clears the current diary context and navigates back to the map overview. */
  private navigateBackToDiaryOverview(): void {
    this.state.clearCurrentDiarySelection({ preserveVisibleDiaries: true });
    this.state.panelHeight.set('collapsed');
    this.currentDiaryId = null;
    this.backToDiaries({ skipStateReset: true, skipGlobalReload: true });
  }
}
