import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { TextInputComponent } from 'components/Atoms/text-input/text-input.component';
import { EditorComponent } from 'shared/editor/editor.component';
import { SelectComponent } from 'components/Atoms/select/select.component';
import { ItemProps } from '@model/select.model';

export type CreationModalStage = 'diary' | 'step';

export interface DiaryFormPayload {
  title: string;
  travelPeriod: string | null;
  coverUrl: string | null;
  description: string;
  isPrivate?: boolean | null;
  isPublished?: boolean | null;
  status?: 'IN_PROGRESS' | 'COMPLETED' | null;
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
  startDate: string | null;
  endDate: string | null;
  themeId: number | null;
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
  ],
  templateUrl: './create-diary-modal.component.html',
  styleUrl: './create-diary-modal.component.scss',
})
export class CreateDiaryModalComponent {
  @Input() isMobile = false;
  @Input() isSubmitting = false;
  @Input() errorMessage: string | null = null;
  @Input() availableThemes: ItemProps[] = [];
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() initialDiary: { title: string; description: string; coverUrl: string | null } | null = null;

  @Output() cancel = new EventEmitter<void>();
  @Output() submitDiary = new EventEmitter<DiaryCreationPayload>();

  readonly diaryForm: FormGroup;
  readonly stepForm: FormGroup;

  diaryEditorContent = '';
  stepEditorContent = '';
  stage: CreationModalStage = 'diary';

  constructor(private readonly fb: FormBuilder) {
    this.diaryForm = this.buildDiaryForm();
    this.stepForm = this.buildStepForm();
  }

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
  private buildDiaryForm(): FormGroup {
    return this.fb.group({
      title: this.fb.control('', [Validators.required, Validators.maxLength(150)]),
      period: this.fb.control(''),
      coverUrl: this.fb.control(''),
      description: this.fb.control('', [Validators.required, Validators.minLength(10)]),
      isPrivate: this.fb.control(false),
      isPublished: this.fb.control(true),
      status: this.fb.control<'IN_PROGRESS' | 'COMPLETED'>('IN_PROGRESS'),
      canComment: this.fb.control(true),
    });
  }

  /**
   * Pré-remplit le formulaire carnet avec les données fournies.
   */
  private patchDiaryForm(data: { title: string; description: string; coverUrl: string | null }): void {
    this.diaryEditorContent = data.description ?? '';
    this.diaryForm.patchValue(
      {
        title: data.title ?? '',
        description: data.description ?? '',
        coverUrl: data.coverUrl ?? '',
        // Conserver les valeurs par défaut pour visibilité/statut si non fournis
      },
      { emitEvent: false }
    );
  }

  /**
   * Construit le formulaire pour la section 'étape'.
   */
  private buildStepForm(): FormGroup {
    return this.fb.group({
      title: this.fb.control('', [Validators.required, Validators.maxLength(150)]),
      city: this.fb.control('', [Validators.required, Validators.maxLength(200)]),
      country: this.fb.control('', [Validators.required, Validators.maxLength(200)]),
      continent: this.fb.control('', [Validators.required, Validators.maxLength(200)]),
      latitude: this.fb.control('', [Validators.required]),
      longitude: this.fb.control('', [Validators.required]),
      description: this.fb.control('', [Validators.required, Validators.minLength(10)]),
      mediaUrl: this.fb.control(''),
      startDate: this.fb.control(''),
      endDate: this.fb.control(''),
      themeId: this.fb.control<number | null>(null),
    });
  }

  onDiaryEditorChange(content: string): void {
    this.diaryEditorContent = content;
    this.diaryForm.patchValue({ description: content ?? '' }, { emitEvent: false });
    this.diaryForm.get('description')?.markAsDirty();
  }

  onStepEditorChange(content: string): void {
    this.stepEditorContent = content;
    this.stepForm.patchValue({ description: content ?? '' }, { emitEvent: false });
    this.stepForm.get('description')?.markAsDirty();
  }

  handleDiarySubmit(): void {
    /**
     * Soumission de l'étape 'carnet'.
     * - En mode édition: émet directement le payload pour mise à jour, sans passer à l'étape 'step'.
     * - En mode création: bascule à l'étape 'step'.
     */
    if (this.diaryForm.invalid || this.isSubmitting) {
      this.diaryForm.markAllAsTouched();
      return;
    }

    // En mode édition de carnet, on ne passe pas à l'étape "step".
    if (this.mode === 'edit') {
      // Construit le payload minimal nécessaire côté parent pour la mise à jour du carnet
      const diaryRaw = this.diaryForm.getRawValue();
      const diaryPayload: DiaryFormPayload = {
        title: (diaryRaw.title ?? '').trim(),
        travelPeriod: diaryRaw.period?.toString().trim() || null,
        coverUrl: diaryRaw.coverUrl?.toString().trim() || null,
        description: diaryRaw.description ?? '',
        isPrivate: !!diaryRaw.isPrivate,
        isPublished: !!diaryRaw.isPublished,
        status: diaryRaw.status ?? 'IN_PROGRESS',
        canComment: !!diaryRaw.canComment,
      };

      // On émet via submitDiary pour garder une seule sortie.
      // Le parent (MyTravelsPage) route vers onDiaryEditSubmit lorsque isEditMode = true.
      this.submitDiary.emit({ diary: diaryPayload, step: {
        title: '',
        city: null,
          country: null,
          continent: null,
        latitude: 0,
        longitude: 0,
        description: '',
        mediaUrl: null,
        startDate: null,
          endDate: null,
        themeId: null,
      }});
      return;
    }

    // Mode création: on enchaîne vers l'étape "step".
    this.stage = 'step';
  }

  handleStepSubmit(): void {
    /**
     * Soumission de l'étape 'step' (création uniquement).
     * Construit le payload carnet+étape et le propage au parent.
     */
    if (this.stepForm.invalid || this.isSubmitting) {
      this.stepForm.markAllAsTouched();
      return;
    }

    const raw = this.stepForm.getRawValue();
    console.log('raw step', raw)
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
      travelPeriod: diaryRaw.period?.toString().trim() || null,
      coverUrl: diaryRaw.coverUrl?.toString().trim() || null,
      description: diaryRaw.description ?? '',
      isPrivate: !!diaryRaw.isPrivate,
      isPublished: !!diaryRaw.isPublished,
      status: diaryRaw.status ?? 'IN_PROGRESS',
      canComment: !!diaryRaw.canComment,
    };

    const stepPayload: StepFormPayload = {
      title: (raw.title ?? '').trim(),
      city: raw.city?.toString().trim() || null,
      country: raw.country?.toString().trim() || null,
      continent: raw.continent?.toString().trim() || null,
      latitude,
      longitude,
      description: raw.description ?? '',
      mediaUrl: raw.mediaUrl?.toString().trim() || null,
      startDate: raw.startDate?.toString().trim() || null,
      endDate: raw.endDate?.toString().trim() || null,
      themeId: raw.themeId ?? null,
    };
    console.log('step payload dnas le create diray', stepPayload)

    this.submitDiary.emit({ diary: diaryPayload, step: stepPayload });
  }

  handleCancel(): void {
    if (this.isSubmitting) {
      return;
    }
    this.cancel.emit();
    this.resetForms();
  }

  onThemeChange(selection: ItemProps | ItemProps[]): void {
    const item = Array.isArray(selection) ? selection[0] : selection;
    const parsed = item ? Number(item.id) : null;
    const themeId = typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
    this.stepForm.patchValue({ themeId });
  }

  goBackToDiaryStage(): void {
    if (this.isSubmitting) {
      return;
    }
    this.stage = 'diary';
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
    });
  }
}
