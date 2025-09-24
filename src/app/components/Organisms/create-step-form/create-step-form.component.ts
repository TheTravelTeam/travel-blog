import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { TextInputComponent } from 'components/Atoms/text-input/text-input.component';
import { EditorComponent } from 'shared/editor/editor.component';
import { SelectComponent } from 'components/Atoms/select/select.component';
import { ItemProps } from '@model/select.model';
import { Step } from '@model/step.model';
import { StepFormResult } from '@model/stepFormResult.model';
import {
  LocationPickerModalComponent,
  LocationPickerResult,
} from 'components/Organisms/location-picker-modal/location-picker-modal.component';
import { GeocodingService, ReverseGeocodingResult } from '@service/geocoding.service';
import { finalize, Subscription } from 'rxjs';

@Component({
  selector: 'app-create-step-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    TextInputComponent,
    EditorComponent,
    SelectComponent,
    LocationPickerModalComponent,
  ],
  templateUrl: './create-step-form.component.html',
  styleUrl: './create-step-form.component.scss',
})
/**
 * Standalone step creation form shared across the application.
 * Embeds a location picker modal and enriches the form with Nominatim reverse-geocoding data.
 */
export class CreateStepFormComponent implements OnDestroy {
  @Input() isSubmitting = false;
  @Input() errorMessage: string | null = null;
  @Input() availableThemes: ItemProps[] = [];

  @Output() cancel = new EventEmitter<void>();
  @Output() submitStep = new EventEmitter<StepFormResult>();

  readonly stepForm: FormGroup;
  stepEditorContent = '';
  isLocationModalOpen = false;
  isGeocoding = false;
  geocodingError: string | null = null;
  private submitAttempted = false;
  private geocodingSub: Subscription | null = null;

  constructor(private readonly fb: FormBuilder, private readonly geocodingService: GeocodingService) {
    this.stepForm = this.buildStepForm();
  }

  ngOnDestroy(): void {
    this.clearGeocodingSubscription();
  }

  /**
   * Clears the reactive form and associated editor state, restoring the pristine creation view.
   */
  /** Reset the reactive form and derived state. */
  reset(): void {
    this.stepEditorContent = '';
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
    this.geocodingError = null;
    this.submitAttempted = false;
    this.clearGeocodingSubscription();
  }

  /**
   * Prefills the form with values coming from an existing step so the user can edit them.
   * Handles optional fields (media, dates) and keeps the rich-text editor in sync.
   */
  /** Pre-fill the form with an existing step (used for edition flows). */
  populateFromStep(step: Step): void {
    const startDate = this.formatDateTimeLocal(step.startDate);
    const endDate = this.formatDateTimeLocal(step.endDate ?? null);

    const primaryMedia = Array.isArray(step.media) && step.media.length ? step.media[0].fileUrl ?? '' : '';

    this.stepForm.reset({
      title: step.title ?? '',
      city: step.city ?? '',
      country: step.country ?? '',
      continent: step.continent ?? '',
      latitude: step.latitude != null ? step.latitude.toString() : '',
      longitude: step.longitude != null ? step.longitude.toString() : '',
      description: step.description ?? '',
      mediaUrl: primaryMedia,
      startDate,
      endDate,
      themeId: step.themeId ?? null,
    });

    this.stepEditorContent = step.description ?? '';
  }

  /** Keep the rich-text editor in sync with the form control. */
  onEditorChange(content: string): void {
    this.stepEditorContent = content ?? '';
    this.stepForm.patchValue({ description: this.stepEditorContent }, { emitEvent: false });
    this.stepForm.get('description')?.markAsDirty();
  }

  /** Update the selected theme id whenever the dropdown emits a new selection. */
  onThemeChange(selection: ItemProps | ItemProps[]): void {
    const item = Array.isArray(selection) ? selection[0] : selection;
    const parsed = item ? Number(item.id) : null;
    const themeId = typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
    this.stepForm.patchValue({ themeId });
  }

  /**
   * Emits the normalized payload when the form is valid. Performs lightweight coercion
   * for numeric inputs and guards against invalid lat/lng values before emitting.
   */
  /** Validate the form, coerce types, and emit the result upstream. */
  handleSubmit(): void {
    this.submitAttempted = true;
    if (this.stepForm.invalid || this.isSubmitting) {
      this.stepForm.markAllAsTouched();
      return;
    }

    const raw = this.stepForm.getRawValue();
    const latitude = raw.latitude ? parseFloat(raw.latitude.toString()) : NaN;
    const longitude = raw.longitude ? parseFloat(raw.longitude.toString()) : NaN;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      this.stepForm.get('latitude')?.setErrors({ invalid: true });
      this.stepForm.get('longitude')?.setErrors({ invalid: true });
      return;
    }

    const result: StepFormResult = {
      title: (raw.title ?? '').trim(),
      city: raw.city?.toString().trim() || null,
      country: raw.country?.toString().trim() || null,
      continent: raw.continent?.toString().trim() || null,
      latitude,
      longitude,
      description: raw.description ?? '',
      mediaUrl: raw.mediaUrl?.toString().trim() || null,
      startDate: this.normalizeDateInput(raw.startDate),
      endDate: this.normalizeDateInput(raw.endDate),
      themeId: raw.themeId ?? null,
    };

    this.submitStep.emit(result);
  }

  /**
   * Notifies the parent that the flow is aborted and restores the initial state
   * unless a submission is currently pending.
   */
  /** Notify the parent that the flow is aborted and wipe the form. */
  handleCancel(): void {
    if (this.isSubmitting) {
      return;
    }
    this.cancel.emit();
    this.reset();
  }

  /** Open the map picker modal and clear previous lookup errors. */
  openLocationModal(): void {
    this.geocodingError = null;
    this.isLocationModalOpen = true;
  }

  /** Close the location picker modal. */
  closeLocationModal(): void {
    this.isLocationModalOpen = false;
  }

  /** Return the coordinates currently stored in the form, if valid. */
  get locationInitialCoordinates(): LocationPickerResult | null {
    const latitude = this.parseCoordinate(this.stepForm.get('latitude')?.value);
    const longitude = this.parseCoordinate(this.stepForm.get('longitude')?.value);
    if (latitude == null || longitude == null) {
      return null;
    }
    return { lat: latitude, lng: longitude };
  }

  /** True when the hidden latitude/longitude controls contain a valid numeric value. */
  get hasSelectedCoordinates(): boolean {
    return !!this.locationInitialCoordinates;
  }

  /** Human-readable summary of the selected coordinates. */
  get selectedCoordinatesSummary(): string {
    const coords = this.locationInitialCoordinates;
    if (!coords) {
      return 'Aucun point sélectionné';
    }
    return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
  }

  /** True when the user attempted submission without selecting a coordinate. */
  get showLocationRequiredMessage(): boolean {
    return !this.hasSelectedCoordinates && this.submitAttempted;
  }

  /** Combine city/country for the recap badge below the button. */
  get locationEnrichmentSummary(): string | null {
    const city = this.stepForm.get('city')?.value?.toString().trim();
    const country = this.stepForm.get('country')?.value?.toString().trim();
    if (city && country) {
      return `${city}, ${country}`;
    }
    return city || country || null;
  }

  /** Persist the coordinate coming from the modal and trigger a reverse geocoding lookup. */
  handleLocationConfirm(selection: LocationPickerResult): void {
    this.closeLocationModal();
    const formattedLat = selection.lat.toFixed(6);
    const formattedLng = selection.lng.toFixed(6);

    this.stepForm.patchValue({
      latitude: formattedLat,
      longitude: formattedLng,
    });
    this.stepForm.get('latitude')?.markAsDirty();
    this.stepForm.get('longitude')?.markAsDirty();

    this.fetchLocationDetails(selection.lat, selection.lng);
  }

  /** Call Nominatim and update the form with the returned address components. */
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
        next: (result) => this.applyGeocodingResult(result),
        error: () => {
          this.geocodingError = "Impossible de récupérer l'adresse à partir de cette position.";
        },
      });
  }

  /** Patch the relevant form controls using the Nominatim result. */
  private applyGeocodingResult(result: ReverseGeocodingResult): void {
    const payload: Record<string, string> = {};

    if (result.city) {
      payload['city'] = result.city;
    }
    if (result.country) {
      payload['country'] = result.country;
    }
    if (result.continent) {
      payload['continent'] = result.continent;
    }

    if (Object.keys(payload).length > 0) {
      this.stepForm.patchValue(payload);
    }
  }

  /** Ensure the geocoding subscription is cleaned up to avoid leaks. */
  private clearGeocodingSubscription(): void {
    if (this.geocodingSub) {
      this.geocodingSub.unsubscribe();
      this.geocodingSub = null;
    }
  }

  /** Safely parse a coordinate coming from the form controls. */
  private parseCoordinate(value: unknown): number | null {
    if (value == null) {
      return null;
    }
    const parsed = Number.parseFloat(value.toString());
    return Number.isFinite(parsed) ? parsed : null;
  }

  /**
   * Returns a user-facing validation message for a form control when it is invalid.
   * Only surfaces errors after the control has been touched or marked dirty to
   * avoid flashing messages on pristine fields.
   */
  getControlError(controlName: string): string | undefined {
    const control = this.stepForm.get(controlName);
    if (!control || !control.invalid || (!control.touched && !control.dirty)) {
      return undefined;
    }

    if (control.errors?.['required']) {
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

  private buildStepForm(): FormGroup {
    return this.fb.group({
      title: this.fb.control('', [Validators.required, Validators.maxLength(150)]),
      city: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]),
      country: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]),
      continent: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]),
      latitude: this.fb.control('', [Validators.required]),
      longitude: this.fb.control('', [Validators.required]),
      description: this.fb.control('', [Validators.required, Validators.minLength(10)]),
      mediaUrl: this.fb.control(''),
      startDate: this.fb.control(''),
      endDate: this.fb.control(''),
      themeId: this.fb.control<number | null>(null),
    });
  }

  private normalizeDateInput(value: unknown): string | null {
    if (value == null) {
      return null;
    }

    const raw = value.toString().trim();
    if (!raw) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
      return raw.slice(0, 10);
    }

    return raw;
  }

  private formatDateTimeLocal(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
