import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TextInputComponent } from 'components/Atoms/text-input/text-input.component';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { AuthService } from '@service/auth.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TextInputComponent, ButtonComponent],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss',
})
export class ResetPasswordPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  resetForm!: FormGroup;
  isSubmitting = false;
  resetCompleted = false;
  generalError = '';
  backendPasswordError = '';
  private token = '';

  private readonly passwordsMatchValidator: ValidatorFn = (group) => {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  };

  ngOnInit(): void {
    this.initializeForm();
    this.resolveToken();
  }

  /**
   * Prépare le formulaire de réinitialisation avec les validations nécessaires.
   */
  private initializeForm(): void {
    this.resetForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordsMatchValidator }
    );

    this.resetForm
      .get('password')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.backendPasswordError = '';
      });
  }

  /**
   * Récupère le jeton présent dans l'URL.
   */
  private resolveToken(): void {
    this.token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';

    if (!this.token) {
      this.generalError = 'Lien invalide ou expiré.';
    }
  }

  /**
   * Retourne le message d'erreur à afficher pour le champ mot de passe.
   */
  getPasswordErrorMessage(): string {
    const control = this.resetForm.get('password');
    if (!control) {
      return '';
    }

    if (this.backendPasswordError) {
      return this.backendPasswordError;
    }

    if (!control.touched && !control.dirty) {
      return '';
    }

    if (control.errors?.['required']) {
      return 'Le mot de passe est requis.';
    }

    if (control.errors?.['minlength']) {
      return 'Le mot de passe doit contenir au moins 8 caractères.';
    }

    return '';
  }

  /**
   * Retourne le message d'erreur pour le champ de confirmation.
   */
  getConfirmPasswordErrorMessage(): string {
    const control = this.resetForm.get('confirmPassword');
    if (!control) {
      return '';
    }

    if (!control.touched && !control.dirty && !this.resetForm.errors?.['passwordMismatch']) {
      return '';
    }

    if (control.errors?.['required']) {
      return 'Veuillez confirmer votre mot de passe.';
    }

    if (this.resetForm.errors?.['passwordMismatch']) {
      return 'Les mots de passe ne correspondent pas.';
    }

    return '';
  }

  /**
   * Soumet la réinitialisation de mot de passe.
   */
  onSubmit(): void {
    this.generalError = '';
    this.backendPasswordError = '';

    if (!this.token) {
      this.generalError = 'Lien invalide ou expiré.';
      return;
    }

    if (this.resetForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const password = this.resetForm.get('password')?.value;
    if (!password) {
      return;
    }

    this.isSubmitting = true;

    this.authService
      .resetPassword(this.token, password)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.resetCompleted = true;
          this.toast.success('Votre mot de passe a été réinitialisé avec succès.');
        },
        error: (error) => this.handleResetError(error),
      });
  }

  /**
   * Redirige l'utilisateur vers la page de connexion.
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Ouvre la page permettant de demander un nouveau lien de réinitialisation.
   */
  navigateToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }

  /**
   * Force la validation visuelle de chaque champ du formulaire.
   */
  private markFormGroupTouched(): void {
    Object.values(this.resetForm.controls).forEach((control) => control.markAsTouched());
  }

  /**
   * Gère les erreurs renvoyées par l'API reset-password.
   */
  private handleResetError(error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 400) {
        this.processBadRequest(error);
        return;
      }

      this.toast.error('Impossible de réinitialiser le mot de passe. Veuillez réessayer plus tard.');
      return;
    }

    this.toast.error('Une erreur inattendue est survenue.');
  }

  /**
   * Interprète le payload 400 pour en extraire les messages adaptés.
   */
  private processBadRequest(error: HttpErrorResponse): void {
    const payload = error.error;

    if (payload?.errors?.password) {
      this.backendPasswordError = Array.isArray(payload.errors.password)
        ? payload.errors.password.join(' ')
        : String(payload.errors.password);
      this.resetForm.get('password')?.setErrors({ server: true });
      return;
    }

    const message = typeof payload?.message === 'string' ? payload.message : '';
    this.generalError = message || 'Lien invalide ou expiré.';
  }
}
