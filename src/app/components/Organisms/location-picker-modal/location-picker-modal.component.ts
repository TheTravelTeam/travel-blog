import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { ButtonComponent } from 'components/Atoms/Button/button.component';

export interface LocationPickerResult {
  lat: number;
  lng: number;
}

/**
 * Modal embedding a Leaflet map to collect a single coordinate from the user.
 * It supports an initial position, click-to-move markers, and optional browser geolocation.
 */
@Component({
  selector: 'app-location-picker-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './location-picker-modal.component.html',
  styleUrl: './location-picker-modal.component.scss',
})
export class LocationPickerModalComponent implements AfterViewInit, OnDestroy {
  @Input() initialCoordinates: LocationPickerResult | null = null;
  @Input() title = 'Sélectionner une localisation';
  @Input() description = 'Cliquez sur la carte pour positionner votre étape.';

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<LocationPickerResult>();

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private userMarker: L.Marker | null = null;
  private selectedLocation: LocationPickerResult | null = null;
  isLocating = false;
  geolocationError: string | null = null;

  /**
   * Initialise the Leaflet map once the DOM container exists, deferring a tick to keep Angular change detection happy.
   */
  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 0);
  }

  ngOnDestroy(): void {
    this.disposeMap();
  }

  /** Returns true when the user has selected a location that can be confirmed. */
  get hasSelection(): boolean {
    return this.selectedLocation != null;
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    if (!this.selectedLocation) {
      return;
    }
    this.confirm.emit(this.selectedLocation);
  }

  /** Build the Leaflet map, register click handler, and optionally re-centre on provided coordinates. */
  private initMap(): void {
    const defaultCenter = { lat: 48.8566, lng: 2.3522 };
    const center = this.initialCoordinates || defaultCenter;

    this.map = L.map(this.mapContainer.nativeElement, {
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
    }).setView([center.lat, center.lng], this.initialCoordinates ? 10 : 4);

    setTimeout(() => this.map?.invalidateSize(), 0);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri',
    }).addTo(this.map);


    if (this.initialCoordinates) {
      this.setMarker(this.initialCoordinates.lat, this.initialCoordinates.lng);
    } else {
      this.setMarker(center.lat, center.lng);
    }

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      const { lat, lng } = event.latlng;
      this.setMarker(lat, lng);
    });

    this.tryLocateUser();
  }

  /** Drop (or move) the selection marker to the provided coordinates. */
  private setMarker(lat: number, lng: number): void {
    if (!this.map) {
      return;
    }

    if (this.marker) {
      this.marker.remove();
    }

    const icon = L.icon({
      iconUrl: 'icon/location-pin.svg',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    this.marker = L.marker([lat, lng], { icon }).addTo(this.map);
    this.selectedLocation = { lat, lng };
  }

  /** Render the helper marker that highlights the geolocated position. */
  private setUserMarker(lat: number, lng: number): void {
    if (!this.map) {
      return;
    }

    if (this.userMarker) {
      this.userMarker.remove();
    }

    const customIcon = L.divIcon({
      html: '<div class="location-picker-modal__user-pin"></div>',
      className: '',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    this.userMarker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);
  }

  /** Try to centre the map on the user's position and seed the selection marker accordingly. */
  private tryLocateUser(): void {
    if (!navigator.geolocation) {
      return;
    }

    this.isLocating = true;
    this.geolocationError = null;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.isLocating = false;
        const { latitude, longitude } = pos.coords;
        if (!this.map) {
          return;
        }
        this.map.flyTo([latitude, longitude], 11, {
          animate: true,
          duration: 1.2,
        });
        this.setMarker(latitude, longitude);
        this.setUserMarker(latitude, longitude);
      },
      () => {
        this.isLocating = false;
        this.geolocationError = "Impossible de récupérer votre position actuelle.";
        console.warn('[LocationPicker] Geolocation failed');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
      }
    );
  }

  /** Tear down the Leaflet instance to avoid memory leaks. */
  private disposeMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.marker = null;
    this.userMarker = null;
    this.selectedLocation = null;
  }
}
