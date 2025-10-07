import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';

import { TextInputComponent } from '../../Atoms/text-input/text-input.component';
import { ButtonComponent } from '../../Atoms/Button/button.component';
import { AuthService } from '@service/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-forgot-password-form',
  imports: [ReactiveFormsModule, TextInputComponent, ButtonComponent],
  templateUrl: './forgot-password-form.component.html',
  styleUrl: './forgot-password-form.component.scss',
})
export class ForgotPasswordFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  forgotPasswordForm!: FormGroup;
  isSubmitting = false;
  requestSent = false;
  submissionError = '';

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  getErrorMessage(fieldName: 'email'): string {
    const control = this.forgotPasswordForm.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return "L'email est requis";
    }

    if (control.errors['email']) {
      return "L'email n'est pas valide";
    }

    return '';
  }

  /**
   * Soumet la demande de réinitialisation en appelant le service d'authentification.
   */
  onSubmit(): void {
    this.submissionError = '';
    this.requestSent = false;

    if (this.forgotPasswordForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const { email } = this.forgotPasswordForm.value;
    this.isSubmitting = true;

    this.authService
      .requestPasswordReset(email)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.requestSent = true;
          this.submissionError = '';
          this.toast.success(
            'Si un compte correspond à cet email, vous recevrez un lien de réinitialisation sous peu.'
          );
        },
        error: (error) => {
          const message = this.extractErrorMessage(error);
          this.submissionError = message;
          this.toast.error(message);
        },
      });
  }

  private markFormGroupTouched(): void {
    Object.values(this.forgotPasswordForm.controls).forEach((control) => control.markAsTouched());
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error;

      if (payload?.errors && typeof payload.errors === 'object') {
        const first = Object.values(payload.errors)[0];
        if (Array.isArray(first)) {
          return first.join(' ');
        }
        if (typeof first === 'string' && first.trim()) {
          return first.trim();
        }
      }

      if (typeof payload === 'string' && payload.trim()) {
        return payload.trim();
      }

      const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
      if (message) {
        return message;
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    return "Impossible d'envoyer le lien. Veuillez réessayer plus tard.";
  }
}
