import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { TextInputComponent } from 'components/Atoms/text-input/text-input.component';
import { EditorComponent } from 'shared/editor/editor.component';
import { SelectComponent } from 'components/Atoms/select/select.component';
import { ItemProps } from '@model/select.model';
import { Step } from '@model/step.model';

export interface StepFormResult {
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
  ],
  templateUrl: './create-step-form.component.html',
  styleUrl: './create-step-form.component.scss',
})
export class CreateStepFormComponent {
  @Input() isSubmitting = false;
  @Input() errorMessage: string | null = null;
  @Input() availableThemes: ItemProps[] = [];

  @Output() cancel = new EventEmitter<void>();
  @Output() submitStep = new EventEmitter<StepFormResult>();

  readonly stepForm: FormGroup;
  stepEditorContent = '';

  constructor(private readonly fb: FormBuilder) {
    this.stepForm = this.buildStepForm();
  }

  /**
   * Clears the reactive form and associated editor state, restoring the pristine creation view.
   */
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
  }

  /**
   * Prefills the form with values coming from an existing step so the user can edit them.
   * Handles optional fields (media, dates) and keeps the rich-text editor in sync.
   */
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

  onEditorChange(content: string): void {
    this.stepEditorContent = content ?? '';
    this.stepForm.patchValue({ description: this.stepEditorContent }, { emitEvent: false });
    this.stepForm.get('description')?.markAsDirty();
  }

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
  handleSubmit(): void {
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
  handleCancel(): void {
    if (this.isSubmitting) {
      return;
    }
    this.cancel.emit();
    this.reset();
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
