import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { TextInputComponent } from 'components/Atoms/text-input/text-input.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { EditorComponent } from 'shared/editor/editor.component';
import { SelectComponent } from 'components/Atoms/select/select.component';
import { ItemProps } from '@model/select.model';
import { Step } from '@model/step.model';
import { StepFormResult } from '@model/stepFormResult.model';
import { normalizeThemeSelection } from '@utils/theme-selection.util';
import {
  LocationPickerModalComponent,
  LocationPickerResult,
} from 'components/Organisms/location-picker-modal/location-picker-modal.component';
import { GeocodingService, ReverseGeocodingResult } from '@service/geocoding.service';
import { finalize, Subscription } from 'rxjs';
import {
  MediaGridUploaderComponent,
  MediaItem,
} from '../../Molecules/media-grid-uploader/media-grid-uploader.component';

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
/**
 * Standalone step creation form shared across the application.
 * Embeds a location picker modal and enriches the form with Nominatim reverse-geocoding data.
 */
export class CreateStepFormComponent implements OnDestroy {
  @Input() isSubmitting = false;
  @Input() errorMessage: string | null = null;
  @Input() availableThemes: ItemProps[] = [];

  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() cancel = new EventEmitter<void>();
  @Output() submitStep = new EventEmitter<StepFormResult>();

  readonly stepForm: FormGroup;
  stepEditorContent = '';
  isLocationModalOpen = false;
  isGeocoding = false;
  geocodingError: string | null = null;
  private submitAttempted = false;
  private geocodingSub: Subscription | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly geocodingService: GeocodingService
  ) {
    this.stepForm = this.buildStepForm();
    this.disableManualLocationControls();
  }
  mediaItems: MediaItem[] = [];
  isMediaUploading = false;
  /** Validator shared across date inputs to ensure ISO or French formatting. */
  private readonly dateFormatValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value == null || value === '') {
      return null;
    }

    const raw = value.toString().trim();
    if (!raw) {
      return null;
    }

    const isIso = /^\d{4}-\d{2}-\d{2}$/.test(raw);
    const isFrench = /^\d{2}\/\d{2}\/\d{4}$/.test(raw);

    return isIso || isFrench ? null : { invalidDate: true };
  };

  /**
   * Receives the latest list of media items uploaded from the grid.
   * @param items Media descriptors emitted by the uploader.
   */
  onMediaItemsChange(items: MediaItem[]) {
    this.mediaItems = items;
    const primary = items[0]?.secureUrl ?? '';
    this.stepForm.patchValue({ mediaUrl: primary }); // compat "champ unique"
    this.stepForm.get('mediaUrl')?.markAsDirty();
  }
  /**
   * Updates the primary media URL when the user selects another preview.
   * @param item Selected media item or null when none.
   */
  onPrimaryMediaChange(item: MediaItem | null) {
    this.stepForm.patchValue({ mediaUrl: item?.secureUrl ?? '' });
  }

  /**
   * Tracks the upload state to prevent submissions while uploading.
   * @param isUploading True when an upload is in progress.
   */
  onMediaUploadStateChange(isUploading: boolean): void {
    this.isMediaUploading = isUploading;
  }

  /** Cleans up pending subscriptions before destroying the component. */
  ngOnDestroy(): void {
    this.clearGeocodingSubscription();
  }

  /**
   * Clears the reactive form and associated editor state, restoring the pristine creation view.
   */
  reset(): void {
    this.stepEditorContent = '';
    this.mediaItems = [];
    this.isMediaUploading = false;
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
      themeIds: [],
    });
    this.disableManualLocationControls();
    this.geocodingError = null;
    this.submitAttempted = false;
    this.clearGeocodingSubscription();
  }

  /**
   * Pre-fill the form with an existing step (used for edition flows).
   * @param step Step to surface in the editor.
   */
  populateFromStep(step: Step): void {
    const startDate = this.formatDate(step.startDate);
    const endDate = this.formatDate(step.endDate ?? null);

    // Réhydratation éventuelle si ton Step contient déjà une liste de médias
    type MediaLike = { fileUrl: string; publicId?: string };
    const mediaSource = step as Partial<{ media?: MediaLike[]; medias?: MediaLike[] }>;
    const list = Array.isArray(mediaSource.media)
      ? mediaSource.media
      : Array.isArray(mediaSource.medias)
        ? mediaSource.medias
        : undefined;
    this.mediaItems = Array.isArray(list)
      ? list.map((m) => ({ publicId: m.publicId ?? '', secureUrl: m.fileUrl }))
      : [];

    const primaryMedia =
      Array.isArray(step.media) && step.media.length ? (step.media[0].fileUrl ?? '') : '';

    const themeIds = this.extractThemeIds(step);
    const primaryThemeId = themeIds.length ? themeIds[0] : (step.themeId ?? null);

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
      themeId: primaryThemeId,
      themeIds,
    });
    this.disableManualLocationControls();

    this.stepEditorContent = step.description ?? '';
  }

  /**
   * Keep the rich-text editor in sync with the form control.
   * @param content Updated HTML payload from the editor.
   */
  onEditorChange(content: string): void {
    this.stepEditorContent = content ?? '';
    this.stepForm.patchValue({ description: this.stepEditorContent }, { emitEvent: false });
    this.stepForm.get('description')?.markAsDirty();
  }

  /**
   * Update the selected theme id whenever the dropdown emits a new selection.
   * @param selection Dropdown payload (single or multi).
   */
  onThemeChange(selection: ItemProps | ItemProps[]): void {
    const items = Array.isArray(selection) ? selection : selection ? [selection] : [];
    const themeIds = items.map((item) => Number(item?.id)).filter((id) => Number.isFinite(id));

    const primaryThemeId = themeIds.length ? themeIds[0] : null;

    this.stepForm.patchValue({ themeId: primaryThemeId, themeIds });
    this.stepForm.get('themeId')?.markAsDirty();
    this.stepForm.get('themeIds')?.markAsDirty();
  }

  /**
   * Validates the form, coerces types, and emits the result upstream.
   */
  handleSubmit(): void {
    this.submitAttempted = true;
    if (this.stepForm.invalid || this.isSubmitting || this.isMediaUploading) {
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

    const { themeIds, primaryThemeId } = normalizeThemeSelection(raw.themeId, raw.themeIds);

    const result: StepFormResult = {
      title: (raw.title ?? '').trim(),
      city: raw.city?.toString().trim() || null,
      country: raw.country?.toString().trim() || null,
      continent: raw.continent?.toString().trim() || null,
      latitude,
      longitude,
      description: raw.description ?? '',
      mediaUrl: raw.mediaUrl?.toString().trim() || null,
      media: this.mediaItems.map((m) => ({ fileUrl: m.secureUrl, publicId: m.publicId })),
      startDate: this.normalizeDateInput(raw.startDate),
      endDate: this.normalizeDateInput(raw.endDate),
      themeId: primaryThemeId,
      themeIds,
    };

    this.submitStep.emit(result);
  }

  /**
   * Notifies the parent that the flow is aborted and restores the initial state when possible.
   */
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

  /**
   * Persist the coordinate coming from the modal and trigger a reverse geocoding lookup.
   * @param selection Coordinates picked by the user.
   */
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

  /**
   * Call Nominatim and update the form with the returned address components.
   * @param lat Latitude to reverse geocode.
   * @param lng Longitude to reverse geocode.
   */
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

  /**
   * Patch the relevant form controls using the Nominatim result.
   * @param result Reverse geocoding response.
   */
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
      this.disableManualLocationControls();
    }
  }

  private disableManualLocationControls(): void {
    this.stepForm.get('city')?.disable({ emitEvent: false });
    this.stepForm.get('country')?.disable({ emitEvent: false });
    this.stepForm.get('continent')?.disable({ emitEvent: false });
  }

  /** Ensure the geocoding subscription is cleaned up to avoid leaks. */
  private clearGeocodingSubscription(): void {
    if (this.geocodingSub) {
      this.geocodingSub.unsubscribe();
      this.geocodingSub = null;
    }
  }

  /**
   * Safely parse a coordinate coming from the form controls.
   * @param value Value to interpret.
   */
  private parseCoordinate(value: unknown): number | null {
    if (value == null) {
      return null;
    }
    const parsed = Number.parseFloat(value.toString());
    return Number.isFinite(parsed) ? parsed : null;
  }

  /**
   * Returns a user-facing validation message for a form control when it is invalid.
   * @param controlName Form control name.
   */
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

    if (control.errors?.['invalidDate']) {
      return 'Format de date invalide. Utilisez jj/mm/aaaa.';
    }

    if (control.errors?.['invalid']) {
      if (controlName === 'latitude' || controlName === 'longitude') {
        return 'Valeur numérique invalide';
      }
      return 'Valeur invalide';
    }

    return undefined;
  }

  /** Creates the reactive form used by the component. */
  private buildStepForm(): FormGroup {
    const form = this.fb.group({
      title: this.fb.control('', [Validators.required, Validators.maxLength(150)]),
      city: this.fb.control('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(200),
      ]),
      country: this.fb.control('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(200),
      ]),
      continent: this.fb.control('', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(200),
      ]),
      latitude: this.fb.control('', [Validators.required]),
      longitude: this.fb.control('', [Validators.required]),
      description: this.fb.control('', [Validators.required, Validators.minLength(10)]),
      mediaUrl: this.fb.control(''),
      startDate: this.fb.control('', [Validators.required, this.dateFormatValidator]),
      endDate: this.fb.control('', [Validators.required, this.dateFormatValidator]),
      themeId: this.fb.control<number | null>(null),
      themeIds: this.fb.control<number[]>([]),
    });

    form.get('city')?.disable({ emitEvent: false });
    form.get('country')?.disable({ emitEvent: false });
    form.get('continent')?.disable({ emitEvent: false });

    return form;
  }

  /**
   * Compute the list of theme identifiers present on the provided step.
   * @param step Source step.
   */
  private extractThemeIds(step: Step | null | undefined): number[] {
    if (!step) {
      return [];
    }

    const collected = new Set<number>();

    if (Array.isArray(step.themeIds)) {
      step.themeIds
        .map((value) => this.coerceThemeId(value))
        .forEach((id) => {
          if (id != null) {
            collected.add(id);
          }
        });
    }

    const addCandidate = (value: unknown) => {
      const parsed = this.coerceThemeId(value);
      if (parsed != null) {
        collected.add(parsed);
      }
    };

    if (step.themeId != null) {
      addCandidate(step.themeId);
    }

    const legacyThemes = (step as unknown as { themes?: unknown[] })?.themes;
    if (Array.isArray(legacyThemes)) {
      legacyThemes.forEach(addCandidate);
    }

    if (Array.isArray(step.stepThemes)) {
      step.stepThemes.forEach((theme) => {
        addCandidate(theme);
        addCandidate(theme?.theme?.id);
      });
    }

    return Array.from(collected);
  }

  /**
   * Best-effort conversion of a value into a numeric theme id.
   * @param value Value to coerce.
   */
  private coerceThemeId(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.trim());
      return Number.isFinite(parsed) ? parsed : null;
    }

    if (value && typeof value === 'object') {
      const fromTheme = (value as { theme?: { id?: unknown } }).theme?.id;
      const direct = (value as { id?: unknown }).id;
      return this.coerceThemeId(fromTheme ?? direct ?? null);
    }

    return null;
  }

  /**
   * Normalises a date input into a YYYY-MM-DD string or null.
   * @param value Raw value coming from the form.
   */
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

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [day, month, year] = raw.split('/');
      return `${year}-${month}-${day}`;
    }

    return raw;
  }

  /**
   * Formats a backend date value into an input-friendly string.
   * @param value Raw date value.
   */
  private formatDate(value: string | Date | null | undefined): string {
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


    return `${year}-${month}-${day}`;
  }
}
