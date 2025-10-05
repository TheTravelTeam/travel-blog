import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { TextInputComponent } from 'components/Atoms/text-input/text-input.component';
import { EditorComponent } from 'shared/editor/editor.component';
import { SelectComponent } from 'components/Atoms/select/select.component';
import { ItemProps } from '@model/select.model';
import { normalizeThemeSelection } from '@utils/theme-selection.util';
import {
  LocationPickerModalComponent,
  LocationPickerResult,
} from 'components/Organisms/location-picker-modal/location-picker-modal.component';
import { GeocodingService, ReverseGeocodingResult } from '@service/geocoding.service';
import { CloudinaryService } from '@service/cloudinary.service';
import { finalize, Subscription } from 'rxjs';
import {
  MediaGridUploaderComponent,
  MediaItem,
} from '../../Molecules/media-grid-uploader/media-grid-uploader.component';
import { MediaPayload } from '@model/stepFormResult.model';

export type CreationModalStage = 'diary' | 'step';

export interface DiaryFormPayload {
  title: string;
  startDate: string | null;
  coverUrl: string | null;
  description: string;
  isPrivate?: boolean | null;
  canComment?: boolean | null;
}

export interface StepFormPayload {
  title: string;
  city: string | null;
  country: string | null;
  continent: string | null;
  latitude: number;
  longitude: number;
  description: string;
  mediaUrl: string | null;
  media?: MediaPayload[];
  startDate: string | null;
  endDate: string | null;
  themeId: number | null;
  themeIds: number[];
}

export interface DiaryCreationPayload {
  diary: DiaryFormPayload;
  step: StepFormPayload;
}

@Component({
  selector: 'app-create-diary-modal',
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
  templateUrl: './create-diary-modal.component.html',
  styleUrl: './create-diary-modal.component.scss',
})
/**
 * Two-step wizard used to create a travel diary and seed it with its first step.
 * Shares the same location picker / reverse geocoding logic as the standalone step form.
 */
export class CreateDiaryModalComponent implements OnDestroy, OnChanges {
  @Input() isMobile = false;
  @Input() isSubmitting = false;
  @Input() errorMessage: string | null = null;
  @Input() availableThemes: ItemProps[] = [];
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() initialDiary: { title: string; description: string; coverUrl: string | null } | null =
    null;

  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() cancel = new EventEmitter<void>();
  @Output() submitDiary = new EventEmitter<DiaryCreationPayload>();

  readonly diaryForm: FormGroup;
  readonly stepForm: FormGroup;

  diaryEditorContent = '';
  stepEditorContent = '';
  stage: CreationModalStage = 'diary';

  isStepLocationModalOpen = false;
  isStepGeocoding = false;
  stepGeocodingError: string | null = null;
  private stepSubmitAttempted = false;
  private stepGeocodingSub: Subscription | null = null;
  isCoverUploading = false;
  coverUploadError: string | null = null;
  private coverUploadSub: Subscription | null = null;
  private readonly coverUploadFolder = 'travel-diaries/covers';
  stepMediaItems: MediaItem[] = [];
  isStepMediaUploading = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly geocodingService: GeocodingService,
    private readonly cloudinaryService: CloudinaryService
  ) {
    this.diaryForm = this.buildDiaryForm();
    this.stepForm = this.buildStepForm();
  }

  onStepMediaItemsChange(items: MediaItem[]): void {
    this.stepMediaItems = items;
    const primary = items[0]?.secureUrl ?? '';
    this.stepForm.patchValue({ mediaUrl: primary });
    this.stepForm.get('mediaUrl')?.markAsDirty();
  }

  onStepPrimaryMediaChange(item: MediaItem | null): void {
    this.stepForm.patchValue({ mediaUrl: item?.secureUrl ?? '' });
  }

  onStepMediaUploadChange(isUploading: boolean): void {
    this.isStepMediaUploading = isUploading;
  }

  ngOnDestroy(): void {
    this.clearStepGeocodingSubscription();
    this.clearCoverUploadSubscription();
  }

  /** Rehydrate the diary form when editing an existing travel diary. */
  ngOnChanges(): void {
    /**
     * Lorsque le composant reçoit un mode 'edit' et des valeurs initiales,
     * le formulaire carnet est patché pour pré-remplir les champs.
     */
    if (this.mode === 'edit' && this.initialDiary) {
      this.patchDiaryForm(this.initialDiary);
    }
  }

  /**
   * Construit le formulaire pour la section 'carnet'.
   */
  /** Build the FormGroup that stores the diary section. */
  private buildDiaryForm(): FormGroup {
    return this.fb.group({
      title: this.fb.control('', [Validators.required, Validators.maxLength(150)]),
      period: this.fb.control(''),
      coverUrl: this.fb.control(''),
      description: this.fb.control('', [Validators.required, Validators.minLength(10)]),
      isPrivate: this.fb.control(false),
      canComment: this.fb.control(true),
    });
  }

  /**
   * Pré-remplit le formulaire carnet avec les données fournies.
   */
  /** Apply initial values when the component is used in edit mode. */
  private patchDiaryForm(data: {
    title: string;
    description: string;
    coverUrl: string | null;
  }): void {
    this.diaryEditorContent = data.description ?? '';
    this.diaryForm.patchValue(
      {
        title: data.title ?? '',
        description: data.description ?? '',
        coverUrl: data.coverUrl ?? '',
        // Conserver les valeurs par défaut pour visibilité/commentaires si non fournis
      },
      { emitEvent: false }
    );
  }

  /**
   * Construit le formulaire pour la section 'étape'.
   */
  /** Build the FormGroup that stores the first-step section. */
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
      startDate: this.fb.control(''),
      endDate: this.fb.control(''),
      themeId: this.fb.control<number | null>(null),
      themeIds: this.fb.control<number[]>([]),
    });

    form.get('city')?.disable({ emitEvent: false });
    form.get('country')?.disable({ emitEvent: false });
    form.get('continent')?.disable({ emitEvent: false });

    return form;
  }

  /** Keep the diary rich-text editor synchronous with the form control. */
  /**
   * Syncs the diary editor content with the form control.
   * @param content HTML payload emitted by the editor.
   */
  onDiaryEditorChange(content: string): void {
    this.diaryEditorContent = content;
    this.diaryForm.patchValue({ description: content ?? '' }, { emitEvent: false });
    this.diaryForm.get('description')?.markAsDirty();
  }

  /** Keep the step rich-text editor synchronous with the form control. */
  /**
   * Syncs the step editor content with the step form control.
   * @param content HTML payload emitted by the editor.
   */
  onStepEditorChange(content: string): void {
    this.stepEditorContent = content;
    this.stepForm.patchValue({ description: content ?? '' }, { emitEvent: false });
    this.stepForm.get('description')?.markAsDirty();
  }

  /** Handles submission of the diary stage and switches to the step stage. */
  handleDiarySubmit(): void {
    /**
     * Soumission de l'étape 'carnet'.
     * - En mode édition: émet directement le payload pour mise à jour, sans passer à l'étape 'step'.
     * - En mode création: bascule à l'étape 'step'.
     */
    if (this.diaryForm.invalid || this.isSubmitting || this.isCoverUploading) {
      this.diaryForm.markAllAsTouched();
      return;
    }

    // En mode édition de carnet, on ne passe pas à l'étape "step".
    if (this.mode === 'edit') {
      // Construit le payload minimal nécessaire côté parent pour la mise à jour du carnet
      const diaryRaw = this.diaryForm.getRawValue();
      const diaryPayload: DiaryFormPayload = {
        title: (diaryRaw.title ?? '').trim(),
        startDate: this.normalizeDateInput(diaryRaw.period),
        coverUrl: diaryRaw.coverUrl?.toString().trim() || null,
        description: diaryRaw.description ?? '',
        isPrivate: !!diaryRaw.isPrivate,
        canComment: !!diaryRaw.canComment,
      };

      // On émet via submitDiary pour garder une seule sortie.
      // Le parent (MyTravelsPage) route vers onDiaryEditSubmit lorsque isEditMode = true.
      this.submitDiary.emit({
        diary: diaryPayload,
        step: {
          title: '',
          city: null,
          country: null,
          continent: null,
          latitude: 0,
          longitude: 0,
          description: '',
          mediaUrl: null,
          media: [],
          startDate: null,
          endDate: null,
          themeId: null,
          themeIds: [],
        },
      });
      return;
    }

    // Mode création: on enchaîne vers l'étape "step".
    this.stepMediaItems = [];
    this.isStepMediaUploading = false;
    this.stage = 'step';
  }

  /** Final submission handler that emits the diary + step payload upstream. */
  handleStepSubmit(): void {
    /**
     * Soumission de l'étape 'step' (création uniquement).
     * Construit le payload carnet+étape et le propage au parent.
     */
    this.stepSubmitAttempted = true;
    if (this.stepForm.invalid || this.isSubmitting || this.isStepMediaUploading) {
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

    const diaryRaw = this.diaryForm.getRawValue();

    const diaryPayload: DiaryFormPayload = {
      title: (diaryRaw.title ?? '').trim(),
      startDate: this.normalizeDateInput(diaryRaw.period),
      coverUrl: diaryRaw.coverUrl?.toString().trim() || null,
      description: diaryRaw.description ?? '',
      isPrivate: !!diaryRaw.isPrivate,
      canComment: !!diaryRaw.canComment,
    };

    const { themeIds, primaryThemeId } = normalizeThemeSelection(raw.themeId, raw.themeIds);

    const stepPayload: StepFormPayload = {
      title: (raw.title ?? '').trim(),
      city: raw.city?.toString().trim() || null,
      country: raw.country?.toString().trim() || null,
      continent: raw.continent?.toString().trim() || null,
      latitude,
      longitude,
      description: raw.description ?? '',
      mediaUrl: raw.mediaUrl?.toString().trim() || null,
      media: this.stepMediaItems.map((item) => ({
        fileUrl: item.secureUrl,
        publicId: item.publicId,
      })),
      startDate: this.normalizeDateInput(raw.startDate),
      endDate: this.normalizeDateInput(raw.endDate),
      themeId: primaryThemeId,
      themeIds,
    };
    this.submitDiary.emit({ diary: diaryPayload, step: stepPayload });
  }

  /** Cancel the wizard and reset both forms. */
  handleCancel(): void {
    if (this.isSubmitting) {
      return;
    }
    this.cancel.emit();
    this.resetForms();
  }

  /**
   * Handles cover file selection and forwards it to Cloudinary.
   * @param event Native input event carrying the file.
   */
  onCoverFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.coverUploadError = null;
    this.clearCoverUploadSubscription();
    this.isCoverUploading = true;

    this.coverUploadSub = this.cloudinaryService
      .uploadImage(file, { folder: this.coverUploadFolder })
      .pipe(
        finalize(() => {
          this.isCoverUploading = false;
          input.value = '';
        })
      )
      .subscribe({
        next: (result) => {
          console.info('resultat upload Cloudinary', result);
          this.diaryForm.patchValue({ coverUrl: result.secureUrl });
          this.diaryForm.get('coverUrl')?.markAsDirty();
        },
        error: () => {
          this.coverUploadError = "Impossible de téléverser l'image. Veuillez réessayer.";
        },
      });
  }

  /**
   * Returns a localized validation message for the embedded step form.
   * Mirrors the behaviour of the standalone step form so both flows stay consistent.
   */
  /**
   * Return a translated validation message for the embedded step form.
   * Mirrors the behaviour of the standalone component for consistency.
   */
  /**
   * Return a translated validation message for the embedded step form.
   * @param controlName Step form control name.
   */
  getStepControlError(controlName: string): string | undefined {
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

  /**
   * Keeps the step theme controls in sync with the multi-select widget.
   * @param selection Selected items emitted by the select component.
   */
  onThemeChange(selection: ItemProps | ItemProps[]): void {
    const items = Array.isArray(selection) ? selection : selection ? [selection] : [];
    const themeIds = items.map((item) => Number(item?.id)).filter((id) => Number.isFinite(id));

    const primaryThemeId = themeIds.length ? themeIds[0] : null;

    this.stepForm.patchValue({ themeId: primaryThemeId, themeIds });
    this.stepForm.get('themeId')?.markAsDirty();
    this.stepForm.get('themeIds')?.markAsDirty();
  }

  /** Navigate back to the diary stage (create mode only). */
  /** Navigate back to the diary stage (create mode only). */
  goBackToDiaryStage(): void {
    if (this.isSubmitting) {
      return;
    }
    this.stage = 'diary';
    this.stepSubmitAttempted = false;
    this.stepGeocodingError = null;
    this.clearStepGeocodingSubscription();
    this.stepMediaItems = [];
    this.isStepMediaUploading = false;
  }

  /** Open the shared location picker modal for the step section. */
  /** Open the shared location picker modal for the step section. */
  openStepLocationModal(): void {
    this.stepGeocodingError = null;
    this.isStepLocationModalOpen = true;
  }

  /** Close the step location picker modal. */
  /** Close the step location picker modal. */
  closeStepLocationModal(): void {
    this.isStepLocationModalOpen = false;
  }

  /** Return the coordinates currently stored in the step form, if valid. */
  get stepLocationInitialCoordinates(): LocationPickerResult | null {
    const latitude = this.parseCoordinate(this.stepForm.get('latitude')?.value);
    const longitude = this.parseCoordinate(this.stepForm.get('longitude')?.value);
    if (latitude == null || longitude == null) {
      return null;
    }
    return { lat: latitude, lng: longitude };
  }

  /** Combine the main address pieces for the badge displayed under the button. */
  get stepLocationSummary(): string | null {
    const city = this.stepForm.get('city')?.value?.toString().trim();
    const country = this.stepForm.get('country')?.value?.toString().trim();
    if (city && country) {
      return `${city}, ${country}`;
    }
    return city || country || null;
  }

  /** Human-readable coordinate summary used as fallback when we have no address. */
  get stepSelectedCoordinatesSummary(): string {
    const coords = this.stepLocationInitialCoordinates;
    if (!coords) {
      return 'Aucun point sélectionné';
    }
    return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
  }

  /** True when the user attempts to submit the step without selecting a location. */
  get stepShowLocationRequiredMessage(): boolean {
    return !this.stepLocationInitialCoordinates && this.stepSubmitAttempted;
  }

  /** Persist coordinates selected in the modal and trigger reverse geocoding. */
  handleStepLocationConfirm(selection: LocationPickerResult): void {
    this.closeStepLocationModal();
    const formattedLat = selection.lat.toFixed(6);
    const formattedLng = selection.lng.toFixed(6);

    this.stepForm.patchValue({
      latitude: formattedLat,
      longitude: formattedLng,
    });
    this.stepForm.get('latitude')?.markAsDirty();
    this.stepForm.get('longitude')?.markAsDirty();

    this.fetchStepLocationDetails(selection.lat, selection.lng);
  }

  /** Call Nominatim to obtain address details for the chosen coordinate. */
  private fetchStepLocationDetails(lat: number, lng: number): void {
    this.clearStepGeocodingSubscription();
    this.isStepGeocoding = true;
    this.stepGeocodingError = null;

    this.stepGeocodingSub = this.geocodingService
      .reverseGeocode(lat, lng)
      .pipe(
        finalize(() => {
          this.isStepGeocoding = false;
        })
      )
      .subscribe({
        next: (result) => this.applyStepGeocodingResult(result),
        error: () => {
          this.stepGeocodingError = "Impossible de récupérer l'adresse à partir de cette position.";
        },
      });
  }

  /** Update the step form with the structured address returned by Nominatim. */
  private applyStepGeocodingResult(result: ReverseGeocodingResult): void {
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
      this.stepForm.get('city')?.disable({ emitEvent: false });
      this.stepForm.get('country')?.disable({ emitEvent: false });
      this.stepForm.get('continent')?.disable({ emitEvent: false });
    }
  }

  /** Dispose the active geocoding subscription (modal may close before completion). */
  private clearStepGeocodingSubscription(): void {
    if (this.stepGeocodingSub) {
      this.stepGeocodingSub.unsubscribe();
      this.stepGeocodingSub = null;
    }
  }

  private clearCoverUploadSubscription(): void {
    if (this.coverUploadSub) {
      this.coverUploadSub.unsubscribe();
      this.coverUploadSub = null;
    }
  }

  /** Safely parse coordinates stored as strings in form controls. */
  private parseCoordinate(value: unknown): number | null {
    if (value == null) {
      return null;
    }
    const parsed = Number.parseFloat(value.toString());
    return Number.isFinite(parsed) ? parsed : null;
  }

  private resetForms(): void {
    this.diaryEditorContent = '';
    this.stepEditorContent = '';
    this.resetDiaryForm();
    this.resetStepForm();
    this.stage = 'diary';
  }

  private resetDiaryForm(): void {
    this.diaryForm.reset({
      title: '',
      period: '',
      coverUrl: '',
      description: '',
    });
    this.coverUploadError = null;
    this.isCoverUploading = false;
    this.clearCoverUploadSubscription();
  }

  private resetStepForm(): void {
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
    this.stepForm.get('city')?.disable({ emitEvent: false });
    this.stepForm.get('country')?.disable({ emitEvent: false });
    this.stepForm.get('continent')?.disable({ emitEvent: false });
    this.stepMediaItems = [];
    this.isStepMediaUploading = false;
    this.stepGeocodingError = null;
    this.stepSubmitAttempted = false;
    this.clearStepGeocodingSubscription();
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
}
