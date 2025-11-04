import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { TextInputComponent } from 'components/Atoms/text-input/text-input.component';
import { EditorComponent } from 'shared/editor/editor.component';
import { ItemProps } from '@model/select.model';
import {
  MediaGridUploaderComponent,
  MediaItem,
} from 'components/Molecules/media-grid-uploader/media-grid-uploader.component';
import { CloudinaryService } from '@service/cloudinary.service';
import {
  DiaryCreationPayload,
  DiaryFormPayload,
  StepFormPayload,
} from './create-diary-modal.types';
import { CreateStepFormComponent } from 'components/Organisms/create-step-form/create-step-form.component';
import { StepFormResult } from '@model/stepFormResult.model';
import { decodeHtmlEntities, stripHtmlTags } from 'shared/utils/html.utils';

export type CreationModalStage = 'diary' | 'step';

/**
 * Modale en deux étapes permettant de créer (ou éditer) un carnet puis, si besoin,
 * d’enchaîner sur la première étape via le formulaire partagé `app-create-step-form`.
 * Le composant ne gère plus que le formulaire carnet, l’envoi Cloudinary et la
 * composition du payload final émis au parent.
 */
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
    MediaGridUploaderComponent,
    CreateStepFormComponent,
  ],
  templateUrl: './create-diary-modal.component.html',
  styleUrl: './create-diary-modal.component.scss',
})
export class CreateDiaryModalComponent implements OnChanges, OnDestroy {
  @Input() isMobile = false;
  @Input() isSubmitting = false;
  @Input() errorMessage: string | null = null;
  @Input() availableThemes: ItemProps[] = [];
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() initialDiary: {
    title: string;
    description: string;
    coverUrl: string | null;
    startDate: string | null;
  } | null = null;

  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() cancel = new EventEmitter<void>();
  @Output() submitDiary = new EventEmitter<DiaryCreationPayload>();

  @ViewChild(CreateStepFormComponent) stepFormComponent?: CreateStepFormComponent;
  @ViewChild('coverUploader') coverUploader?: MediaGridUploaderComponent;

  readonly diaryForm: FormGroup;
  diaryEditorContent = '';
  stage: CreationModalStage = 'diary';

  isCoverUploading = false;
  coverUploadError: string | null = null;

  coverItems: MediaItem[] = [];

  readonly coverUploadFolder = 'travel-diaries/covers';

  constructor(
    private readonly fb: FormBuilder,
    private readonly cloudinaryService: CloudinaryService
  ) {
    this.diaryForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(150)]],
      startDate: ['', [Validators.required]],
      coverUrl: [''],
      description: ['', [Validators.required, Validators.minLength(10)]],
      isPrivate: [false],
      canComment: [true],
    });
  }

  ngOnChanges(): void {
    if (this.mode === 'edit' && this.initialDiary) {
      this.patchDiaryForm(this.initialDiary);
    }
  }

  ngOnDestroy(): void {
    this.clearCoverItems();
  }

  onDiaryEditorChange(content: string): void {
    this.diaryEditorContent = content;
    const normalized = this.normalizeDiaryDescription(content);
    const control = this.diaryForm.get('description');
    control?.setValue(normalized, { emitEvent: false });
    control?.markAsDirty();
    control?.updateValueAndValidity({ emitEvent: false });
  }

  async handleDiarySubmit(): Promise<void> {
    if (this.diaryForm.invalid || this.isSubmitting || this.isCoverUploading) {
      this.diaryForm.markAllAsTouched();
      return;
    }

    if (this.mode === 'edit') {
      try {
        await this.ensureCoverUploaded();
      } catch {
        return;
      }
      this.emitDiaryUpdate();
      return;
    }

    this.stage = 'step';
    queueMicrotask(() => this.stepFormComponent?.reset());
  }

  async handleStepFormSubmit(result: StepFormResult): Promise<void> {
    try {
      await this.ensureCoverUploaded();
    } catch {
      return;
    }

    const diaryValue = this.diaryForm.getRawValue();
    const normalizedDescription = this.normalizeDiaryDescription(diaryValue.description);

    const diaryPayload: DiaryFormPayload = {
      title: decodeHtmlEntities(diaryValue.title),
      startDate: diaryValue.startDate || null,
      coverUrl: diaryValue.coverUrl || null,
      description: normalizedDescription,
      isPrivate: diaryValue.isPrivate,
      canComment: diaryValue.canComment,
    };

    const stepPayload: StepFormPayload = {
      title: decodeHtmlEntities(result.title),
      city: result.city,
      country: result.country,
      continent: result.continent,
      latitude: result.latitude,
      longitude: result.longitude,
      description: result.description,
      mediaUrl: result.mediaUrl,
      media: result.media,
      startDate: result.startDate,
      endDate: result.endDate,
      themeId: result.themeId,
    };

    if (!diaryPayload.coverUrl) {
      diaryPayload.coverUrl = stepPayload.media?.[0]?.fileUrl ?? stepPayload.mediaUrl ?? null;
    }

    this.submitDiary.emit({ diary: diaryPayload, step: stepPayload });
  }

  handleStepFormCancel(): void {
    if (this.isSubmitting) {
      return;
    }
    this.stage = 'diary';
    this.stepFormComponent?.reset();
  }

  handleCancel(): void {
    if (this.isSubmitting) {
      return;
    }
    this.cancel.emit();
    this.resetForms();
  }

  onCoverItemsChange(items: MediaItem[]): void {
    this.coverItems = [...items];
    const [first] = this.coverItems;
    this.diaryForm.patchValue({ coverUrl: first?.secureUrl ?? '' });
    this.diaryForm.get('coverUrl')?.markAsDirty();
  }

  onCoverPrimaryChange(item: MediaItem | null): void {
    this.diaryForm.patchValue({ coverUrl: item?.secureUrl ?? '' });
    this.diaryForm.get('coverUrl')?.markAsDirty();
  }

  onCoverUploadStateChange(isUploading: boolean): void {
    this.isCoverUploading = isUploading;
    if (!isUploading) {
      this.coverUploadError = null;
    }
  }

  private async ensureCoverUploaded(): Promise<void> {
    const pending = this.coverItems.filter((item) => item.file && !item.uploaded);
    if (!pending.length) {
      return;
    }

    this.isCoverUploading = true;
    this.coverUploadError = null;

    try {
      for (const item of pending) {
        const file = item.file;
        if (!file) {
          continue;
        }

        const response = await this.cloudinaryService
          .uploadImage(file, { folder: this.coverUploadFolder })
          .toPromise();

        if (!response) {
          throw new Error('Réponse Cloudinary vide');
        }

        if (item.secureUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.secureUrl);
        }

        item.publicId = response.publicId;
        item.secureUrl = response.secureUrl;
        item.file = undefined;
        item.uploaded = true;
      }

      this.coverItems = [...this.coverItems];
      this.diaryForm.patchValue({ coverUrl: this.coverItems[0]?.secureUrl ?? '' });
      this.coverUploadError = null;
    } catch (error) {
      console.error('Cover upload failed', error);
      this.coverUploadError = "Impossible de téléverser la couverture pour l'instant.";
      throw error;
    } finally {
      this.isCoverUploading = false;
    }
  }

  getDiaryControlError(controlName: string): string | undefined {
    const control = this.diaryForm.get(controlName);
    if (!control || !control.invalid || (!control.touched && !control.dirty)) {
      return undefined;
    }

    const errors = control.errors ?? {};

    if (errors['required']) {
      if (controlName === 'startDate') {
        return 'Sélectionnez une date de départ';
      }
      return 'Champ obligatoire';
    }
    if (errors['minlength']) {
      const requiredLength = errors['minlength'].requiredLength;
      return `Saisissez au moins ${requiredLength} caractères`;
    }
    if (errors['maxlength']) {
      const maxLength = errors['maxlength'].requiredLength;
      return `Maximum ${maxLength} caractères autorisés`;
    }
    if (errors['invalidDate']) {
      return 'Format de date invalide. Utilisez jj/mm/aaaa.';
    }

    return undefined;
  }

  private patchDiaryForm(data: {
    title: string;
    description: string;
    coverUrl: string | null;
    startDate: string | null;
  }): void {
    const normalizedDescription = this.normalizeDiaryDescription(data.description);
    this.diaryEditorContent = normalizedDescription;
    this.diaryForm.patchValue(
      {
        title: decodeHtmlEntities(data.title),
        startDate: data.startDate ?? '',
        description: normalizedDescription,
        coverUrl: data.coverUrl ?? '',
      },
      { emitEvent: false }
    );
    this.clearCoverItems();
    const url = data.coverUrl?.trim();
    this.coverItems = url
      ? [
          {
            id: null,
            publicId: null,
            secureUrl: url,
            uploaded: true,
          },
        ]
      : [];
  }

  private emitDiaryUpdate(): void {
    const value = this.diaryForm.getRawValue();
    const normalizedDescription = this.normalizeDiaryDescription(value.description);
    this.submitDiary.emit({
      diary: {
        title: decodeHtmlEntities(value.title),
        startDate: value.startDate || null,
        coverUrl: value.coverUrl || null,
        description: normalizedDescription,
        isPrivate: value.isPrivate,
        canComment: value.canComment,
      },
      step: this.createEmptyStepPayload(),
    });
  }

  private resetForms(): void {
    this.diaryForm.reset({
      title: '',
      startDate: '',
      coverUrl: '',
      description: '',
      isPrivate: false,
      canComment: true,
    });
    this.diaryEditorContent = '';
    this.coverUploadError = null;
   this.isCoverUploading = false;
    this.stage = 'diary';
    this.clearCoverItems();
    this.stepFormComponent?.reset();
  }

  private clearCoverItems(): void {
    this.coverItems.forEach((item) => {
      if (item.secureUrl.startsWith('blob:') && !item.uploaded) {
        URL.revokeObjectURL(item.secureUrl);
      }
    });
    this.coverItems = [];
    if (this.coverUploader) {
      this.coverUploader.clear();
    }
  }

  private normalizeDiaryDescription(value: string | null | undefined): string {
    return stripHtmlTags(value ?? '');
  }

  private createEmptyStepPayload(): StepFormPayload {
    return {
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
    };
  }
}
