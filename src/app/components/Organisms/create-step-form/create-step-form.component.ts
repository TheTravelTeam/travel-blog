import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';

import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { TextInputComponent } from 'components/Atoms/text-input/text-input.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { EditorComponent } from 'shared/editor/editor.component';
import { SelectComponent } from 'components/Atoms/select/select.component';
import { ItemProps } from '@model/select.model';
import {
  LocationPickerModalComponent,
  LocationPickerResult,
} from 'components/Organisms/location-picker-modal/location-picker-modal.component';
import { GeocodingService, ReverseGeocodingResult } from '@service/geocoding.service';
import {
  MediaGridUploaderComponent,
  MediaItem,
} from '../../Molecules/media-grid-uploader/media-grid-uploader.component';
import { StepFormResult } from '@model/stepFormResult.model';
import { Step } from '@model/step.model';
import { decodeHtmlEntities } from 'shared/utils/html.utils';

/**
 * Formulaire autonome pour créer/éditer une étape.
 * Gère le texte, la localisation (via modale) et la galerie d'images.
 * Pensé pour rester lisible par un profil junior : pas de helpers abstraits,
 * seulement du code direct et explicite.
 */
@Component({
  selector: 'app-create-step-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    TextInputComponent,
    IconComponent,
    EditorComponent,
    SelectComponent,
    LocationPickerModalComponent,
    MediaGridUploaderComponent,
  ],
  templateUrl: './create-step-form.component.html',
  styleUrl: './create-step-form.component.scss',
})
export class CreateStepFormComponent implements OnDestroy {
  @Input() isSubmitting = false;
  @Input() errorMessage: string | null = null;
  @Input() availableThemes: ItemProps[] = [];
  @Input() mode: 'create' | 'edit' = 'create';

  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() cancel = new EventEmitter<void>();
  @Output() submitStep = new EventEmitter<StepFormResult>();

  @ViewChild(MediaGridUploaderComponent) mediaUploader?: MediaGridUploaderComponent;

  readonly stepForm: FormGroup;
  stepEditorContent = '';
  mediaItems: MediaItem[] = [];
  isMediaUploading = false;
  isLocationModalOpen = false;
  isGeocoding = false;
  geocodingError: string | null = null;
  submitAttempted = false;
  stepLocation: LocationPickerResult | null = null;

  private geocodingSub: Subscription | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly geocodingService: GeocodingService
  ) {
    this.stepForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(150)]],
      city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      country: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      continent: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      latitude: ['', [Validators.required]],
      longitude: ['', [Validators.required]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      mediaUrl: [''],
      startDate: ['', [Validators.required]],
      endDate: ['', [Validators.required]],
      themeId: [null],
    });

    this.disableLocationControls();
  }

  ngOnDestroy(): void {
    this.geocodingSub?.unsubscribe();
  }

  /** Remet le formulaire dans son état initial. */
  reset(): void {
    this.stepEditorContent = '';
    this.mediaItems = [];
    this.isMediaUploading = false;
    this.isLocationModalOpen = false;
    this.isGeocoding = false;
    this.geocodingError = null;
    this.submitAttempted = false;
    this.stepLocation = null;
    this.stepForm.reset({
      title: '',
      city: '',
      country: '',
      continent: '',
      latitude: '',
      longitude: '',
      description: '',
      mediaUrl: '',
      startDate: '',
      endDate: '',
      themeId: null,
    });
    this.disableLocationControls();
    this.clearGeocodingSubscription();
    this.mediaUploader?.clear();
  }

  get headingLabel(): string {
    return this.mode === 'edit' ? 'Modifier l’étape' : 'Nouvelle étape';
  }

  get locationInitialCoordinates(): LocationPickerResult | null {
    return this.stepLocation;
  }

  get showLocationRequiredMessage(): boolean {
    return !this.stepLocation && this.submitAttempted;
  }

  /** Pré-remplit le formulaire lors d'une édition. */
  populateFromStep(step: Step): void {
    const mediaList = step.media ?? [];
    this.mediaItems = mediaList.map((media) => ({
      publicId: media.publicId ?? null,
      secureUrl: media.fileUrl,
      uploaded: true,
    }));

    const startDate = typeof step.startDate === 'string' ? step.startDate.slice(0, 10) : '';
    const endDate = typeof step.endDate === 'string' ? step.endDate.slice(0, 10) : '';
    this.stepLocation =
      step.latitude != null && step.longitude != null
        ? { lat: Number(step.latitude), lng: Number(step.longitude) }
        : null;

    this.stepForm.reset({
      title: decodeHtmlEntities(step.title ?? ''),
      city: step.city ?? '',
      country: step.country ?? '',
      continent: step.continent ?? '',
      latitude: step.latitude != null ? String(step.latitude) : '',
      longitude: step.longitude != null ? String(step.longitude) : '',
      description: step.description ?? '',
      mediaUrl: this.mediaItems[0]?.secureUrl ?? '',
      startDate,
      endDate,
      themeId: step.themeId ?? null,
    });

    this.disableLocationControls();
    this.stepEditorContent = step.description ?? '';
    this.submitAttempted = false;
  }

  onEditorChange(content: string): void {
    this.stepEditorContent = content ?? '';
    this.stepForm.patchValue({ description: this.stepEditorContent }, { emitEvent: false });
    this.stepForm.get('description')?.markAsDirty();
  }

  onThemeChange(selection: ItemProps | ItemProps[] | null): void {
    const chosen = Array.isArray(selection) ? selection[0] : selection;
    this.stepForm.patchValue({ themeId: chosen?.id ?? null });
    this.stepForm.get('themeId')?.markAsDirty();
  }

  onMediaItemsChange(items: MediaItem[]): void {
    this.mediaItems = [...items];
    const primary = items[0]?.secureUrl ?? '';
    this.stepForm.patchValue({ mediaUrl: primary });
    this.stepForm.get('mediaUrl')?.markAsDirty();
  }

  onPrimaryMediaChange(item: MediaItem | null): void {
    this.stepForm.patchValue({ mediaUrl: item?.secureUrl ?? '' });
    this.stepForm.get('mediaUrl')?.markAsDirty();
  }

  onMediaUploadStateChange(isUploading: boolean): void {
    this.isMediaUploading = isUploading;
  }

  async handleSubmit(): Promise<void> {
    this.submitAttempted = true;
    if (this.stepForm.invalid || this.isSubmitting || this.isMediaUploading) {
      this.stepForm.markAllAsTouched();
      return;
    }

    const raw = this.stepForm.getRawValue();
    const latitude = Number(raw.latitude);
    const longitude = Number(raw.longitude);

    if (!raw.latitude?.toString().trim() || !raw.longitude?.toString().trim()) {
      this.stepForm.get('latitude')?.setErrors({ invalid: true });
      this.stepForm.get('longitude')?.setErrors({ invalid: true });
      return;
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      this.stepForm.get('latitude')?.setErrors({ invalid: true });
      this.stepForm.get('longitude')?.setErrors({ invalid: true });
      return;
    }

    if (this.mediaUploader) {
      try {
        await this.mediaUploader.ensureUploaded();
      } catch {
        // Le composant enfant affiche déjà le message d'erreur approprié.
        return;
      }
    }

    const media = this.mediaItems.map((item) => ({
      fileUrl: item.secureUrl,
      publicId: item.publicId ?? undefined,
    }));

    const payload: StepFormResult = {
      title: decodeHtmlEntities((raw.title ?? '').trim()),
      city: raw.city?.toString().trim() || null,
      country: raw.country?.toString().trim() || null,
      continent: raw.continent?.toString().trim() || null,
      latitude,
      longitude,
      description: raw.description ?? '',
      mediaUrl: raw.mediaUrl?.toString().trim() || null,
      media,
      startDate: raw.startDate?.toString().trim() || null,
      endDate: raw.endDate?.toString().trim() || null,
      themeId: raw.themeId ?? null,
    };

    if (!payload.mediaUrl && media.length) {
      payload.mediaUrl = media[0].fileUrl ?? null;
    }

    this.submitStep.emit(payload);
  }

  handleCancel(): void {
    if (this.isSubmitting) {
      return;
    }
    this.cancel.emit();
    this.reset();
  }

  openLocationModal(): void {
    this.geocodingError = null;
    this.isLocationModalOpen = true;
  }

  closeLocationModal(): void {
    this.isLocationModalOpen = false;
  }

  handleLocationConfirm(selection: LocationPickerResult): void {
    this.closeLocationModal();

    this.stepForm.patchValue({
      latitude: selection.lat.toFixed(6),
      longitude: selection.lng.toFixed(6),
    });
    this.stepForm.get('latitude')?.markAsDirty();
    this.stepForm.get('longitude')?.markAsDirty();
    this.stepLocation = { lat: selection.lat, lng: selection.lng };

    this.fetchLocationDetails(selection.lat, selection.lng);
  }

  getControlError(controlName: string): string | undefined {
    const control = this.stepForm.get(controlName);
    if (!control || !control.invalid || (!control.touched && !control.dirty)) {
      return undefined;
    }

    if (control.errors?.['required']) {
      if (controlName === 'startDate') {
        return 'Sélectionnez une date de départ';
      }
      if (controlName === 'endDate') {
        return 'Sélectionnez une date de fin';
      }
      return 'Champ obligatoire';
    }

    if (control.errors?.['minlength']) {
      const requiredLength = control.errors['minlength'].requiredLength;
      return `Saisissez au moins ${requiredLength} caractères`;
    }

    if (control.errors?.['maxlength']) {
      const maxLength = control.errors['maxlength'].requiredLength;
      return `Maximum ${maxLength} caractères autorisés`;
    }

    if (control.errors?.['invalid']) {
      if (controlName === 'latitude' || controlName === 'longitude') {
        return 'Valeur numérique invalide';
      }
      return 'Valeur invalide';
    }

    return undefined;
  }

  private fetchLocationDetails(lat: number, lng: number): void {
    this.clearGeocodingSubscription();
    this.isGeocoding = true;
    this.geocodingError = null;

    this.geocodingSub = this.geocodingService
      .reverseGeocode(lat, lng)
      .pipe(
        finalize(() => {
          this.isGeocoding = false;
        })
      )
      .subscribe({
        next: (result: ReverseGeocodingResult) => {
          this.stepForm.patchValue({
            city: result.city ?? '',
            country: result.country ?? '',
            continent: result.continent ?? '',
          });
          this.disableLocationControls();
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 403) {
            this.geocodingError =
              "Le service de géocodage a refusé la requête (403). Vérifiez l'adresse de contact configurée et respectez les limites de Nominatim.";
          } else {
            this.geocodingError = "Impossible de récupérer l'adresse à partir de cette position.";
          }
        },
      });
  }

  private disableLocationControls(): void {
    this.stepForm.get('city')?.disable({ emitEvent: false });
    this.stepForm.get('country')?.disable({ emitEvent: false });
    this.stepForm.get('continent')?.disable({ emitEvent: false });
  }

  private clearGeocodingSubscription(): void {
    this.geocodingSub?.unsubscribe();
    this.geocodingSub = null;
  }

}
