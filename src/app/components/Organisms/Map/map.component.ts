// Import Angular
import {
  Component,
  AfterViewInit,
  inject,
  Input,
  ViewChild,
  ViewContainerRef,
  EnvironmentInjector,
  ComponentRef,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';

// Import Leaflet
import * as L from 'leaflet';

// Import services
import { StepService } from './../../../services/step.service';

// Types
import { NominatimResponse } from '../../../model/nominatimResponse';
import { CommonModule } from '@angular/common';
import { MapConfig, mapConfigDefault } from '../../../model/map.model';
import { AvatarComponent } from '../avatar/avatar.component';
import { TravelDiary } from '../../../model/travelDiary';
import { Step } from '../../../model/step';
import { User } from '../../../model/user';
import { CreateDiaryDto } from '../../../dto/createDiaryDto';
import { Media } from '../../../model/media';
import { CreateStepDto } from '../../../dto/createStepDto';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  imports: [CommonModule],
  styleUrl: './map.component.scss',
})
export class MapComponent implements AfterViewInit {
  @ViewChild('markerContainer', { read: ViewContainerRef }) markerContainer!: ViewContainerRef;
  constructor(private injector: EnvironmentInjector) {}

  private http = inject(HttpClient);
  private stepService = inject(StepService);

  private map!: L.Map;
  public currentDiaryId: number | null = null; // id du diary actif
  public currentUser: User | null = null;
  public userLoc: L.LatLng | null = null;
  public isFirstCall = true;

  @Input() viewMode: MapConfig['modeView'] = mapConfigDefault['modeView']; // true = view, false = selection
  @Input() isDiary: MapConfig['isDiary'] = mapConfigDefault['isDiary'];
  @Input() isStep: MapConfig['isStep'] = mapConfigDefault['isStep'];
  @Input() zoomLevel: MapConfig['zoomLevel'] = mapConfigDefault['zoomLevel'];
  @Input() centerLat: MapConfig['centerLat'] = mapConfigDefault['centerLat'];
  @Input() centerLng: MapConfig['centerLng'] = mapConfigDefault['centerLng'];

  private lastPoint: L.LatLng | null = null;

  ngAfterViewInit(): void {
    this.initMap();

    if (this.viewMode) {
      this.loadAllDiaries();
    } else if (this.isStep && this.currentDiaryId) {
      this.loadStepsForCurrentDiary();
    }
  }

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

    this.getGeolocalisation();
    this.map.on('click', (e: L.LeafletMouseEvent) => this.handleCreateOnMapClick(e));
  }

  /**
   * Gère la géolocalisation
   * */
  private getGeolocalisation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.userLoc = L.latLng(pos.coords.latitude, pos.coords.longitude);
          if (this.isFirstCall) {
            this.map.setView(this.userLoc, 10);
            this.isFirstCall = !this.isFirstCall;
          }

          const customIcon = L.divIcon({
            html: `<div class="white-circle"></div>`,
            className: '', // on enlève les classes par défaut Leaflet
            iconSize: [30, 30], // taille du container
            iconAnchor: [15, 15], // point central (pour que ça pointe bien)
          });

          // Ajoute une marqueur en fonction de la géolocalisation si elle existe
          L.marker(this.userLoc, { icon: customIcon })
            .addTo(this.map)
            .bindPopup('Vous êtes ici')
            .openPopup();
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

    if (this.viewMode) return; // Pas de création en viewMode

    if (this.isDiary) {
      // Rentrer les informations provenant d'un formulaire normalement ICI pour la création
      const newDiary: CreateDiaryDto = {
        title: `Diary ${Date.now()}`,
        description: 'Diary ajouté depuis la carte',
        latitude: lat,
        longitude: lng,
        coverMedia: {
          fileUrl:
            'https://www.echosciences-grenoble.fr/uploads/article/image/attachment/1005418938/xl_lens-1209823_1920.jpg',
          mediaType: 'PHOTO',
        },
      };
      // Appelle API pour créer un diary
      this.stepService.addDiary(newDiary).subscribe((diary) => {
        L.marker([lat, lng]).addTo(this.map).bindPopup(diary.title).openPopup();

        this.currentDiaryId = diary.id;
        // Charge les steps du diary en updatant la propriété currentDiaryId
        this.loadStepsForCurrentDiary();
        // update de isStep pour rentrer en mode éditions des étapes (a voir si on le laisse)
        this.isStep = true;
        this.isDiary = false;
      });
    }

    // Ajout des steps sur la map au clique
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
    this.stepService.getAllDiaries().subscribe((diaries: TravelDiary[]) => {
      diaries.forEach((diary: TravelDiary) => {
        // Crée un HTML personnalisé pour le marker

        const html = `
        <div class="custom-marker">
          <img src="${diary.coverMedia.fileUrl}" class="size-md" alt="avatar" />
        </div>
      `;

        // Crée l'icône personnalisée basée sur un marker personnalisée
        const icon = L.divIcon({
          html,
          className: '', // pas de classe Leaflet par défaut
          iconSize: [50, 50],
          iconAnchor: [50, 50],
        });

        const marker = L.marker([diary.latitude, diary.longitude], { icon }).addTo(this.map);
        marker.on('click', () => {
          this.currentDiaryId = diary.id;
          this.map.eachLayer((layer) => {
            if (layer instanceof L.Polyline || layer instanceof L.Marker) {
              this.map.removeLayer(layer);
            }
          });
          // Charder les steps du carnet
          this.loadStepsForCurrentDiary();
        });
      });
    });
  }

  /**
   * Charger steps d'un diary et tracer les lignes
   */
  private loadStepsForCurrentDiary(): void {
    if (!this.currentDiaryId) return;

    // Récupère un diary avec toutes ses étapes et user pour le moment
    this.stepService.getTravelWithSteps(this.currentDiaryId).subscribe((diary: TravelDiary) => {
      const steps: Step[] = diary.steps;
      const currentUser: User = diary.user;
      // Pour chaque étape créé un marquer en utilisant le composant avatar
      steps.forEach((step) => {
        this.addMarkerWithComponent(step.latitude, step.longitude, step.medias, currentUser);
      });

      // Définir la liste des coordonnées des étapes pour faire le tracé
      if (steps.length > 0) {
        const latlngs = steps.map((s) => L.latLng(s.latitude, s.longitude));

        // Déplacer la vue sur l'étape 1 du carnet
        this.map.flyTo([steps[0].latitude, steps[0].longitude], 10, {
          animate: true,
          duration: 1.5,
        });

        // Tracé des ligne entre chaque étape
        L.polyline(latlngs, {
          color: 'deepskyblue',
          weight: 4,
          opacity: 0.8,
        }).addTo(this.map);

        this.lastPoint = latlngs[latlngs.length - 1];
      }
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
    currentUser: User
  ): void {
    //  Crée une div temporaire
    const container = document.createElement('div');
    // Ajouter la class à cette div
    container.classList.add('custom-marker');

    // Crée dynamiquement le composant --> markContainer définit dans le html sert de template pour générer le composant à la volée
    const compRef: ComponentRef<AvatarComponent> = this.markerContainer.createComponent(
      AvatarComponent,
      {
        environmentInjector: this.injector,
      }
    );

    // Passer les inputs du composant ici
    if (medias && medias.length > 0) {
      compRef.setInput('picture', medias[0].fileUrl);
    } else if (currentUser?.username && currentUser?.username.length > 0) {
      compRef.setInput('label', currentUser.username);
    } else {
      compRef.setInput('label', '');
    }

    compRef.setInput('color', 'mint'); // ou ce que tu veux, par exemple "blue", "red", etc.

    // Charger le composant en détectant les changements
    compRef.changeDetectorRef.detectChanges();

    // Récupère le HTML final créé sur le compRef (composant référence)
    const html = compRef.location.nativeElement.outerHTML;

    // Crée l'icon Leaflet personnalisée qui prend le html en propriété
    const icon = L.divIcon({
      html,
      className: '',
      iconSize: [50, 50],
      iconAnchor: [25, 25],
    });

    // Ajoute le marker
    L.marker([lat, lng], { icon }).addTo(this.map);

    // Libère le composant du container pour éviter accumulation
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
  private saveStep(lat: number, lng: number): void {
    // Mettre ici les infos du formulaires / et du clique sur la map pour les envoyer en BDD
    const newStep: CreateStepDto = {
      name: `Step ${Date.now()}`,
      description: 'Ajouté depuis carte',
      latitude: lat,
      longitude: lng,
    };

    this.stepService.addStepToTravel(this.currentDiaryId!, newStep).subscribe((travel) => {
      console.info('✅ Step sauvegardé', travel);
    });
  }

  // Retour sur les journaux
  // ClearmapLayers --> clean toute la map des markers
  // Repasse en view mode (pas d'ajout en bdd au clique)
  // Recharge tous les diaries
  public backToDiaries(): void {
    this.clearMapLayers();
    this.viewMode = true;
    this.currentDiaryId = null;
    this.lastPoint = null;
    this.loadAllDiaries();
    if (navigator.geolocation) {
      this.getGeolocalisation();
      if (this.userLoc) {
        this.map.flyTo(this.userLoc, 10, {
          animate: true,
          duration: 1.5,
        });
      }
    }
  }

  // Clean tous les marqueurs et tous les tracés
  private clearMapLayers(): void {
    this.map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        this.map.removeLayer(layer);
      }
    });

    // Garder les tuiles
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri' }
    ).addTo(this.map);
  }
}
