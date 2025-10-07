import { Component, inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '@service/auth.service';
import { TextInputComponent } from '../../Atoms/text-input/text-input.component';
import { ButtonComponent } from '../../Atoms/Button/button.component';

@Component({
  selector: 'app-register-form',
  imports: [ReactiveFormsModule, TextInputComponent, ButtonComponent],
  templateUrl: './register-form.component.html',
  styleUrl: './register-form.component.scss',
})
export class RegisterFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  registerForm!: FormGroup;
  isSubmitting = false;
  submissionError = '';

  private readonly passwordsMatchValidator: ValidatorFn = (
    control: AbstractControl
  ): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordsMismatch: true };
  };

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.registerForm = this.fb.group(
      {
        pseudo: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  getErrorMessage(fieldName: string): string {
    const control = this.registerForm.get(fieldName);
    if (!control || !control.touched) return '';

    const errors = control.errors;

    switch (fieldName) {
      case 'pseudo':
        if (errors?.['required']) return 'Le pseudo est requis';
        if (errors?.['minlength']) return 'Le pseudo doit contenir au moins 3 caractères';
        break;
      case 'email':
        if (errors?.['required']) return "L'email est requis";
        if (errors?.['email']) return "L'email n'est pas valide";
        break;
      case 'password':
        if (errors?.['required']) return 'Le mot de passe est requis';
        if (errors?.['minlength']) return 'Le mot de passe doit contenir au moins 6 caractères';
        break;
      case 'confirmPassword':
        if (errors?.['required']) return 'La confirmation du mot de passe est requise';
        if (this.registerForm.hasError('passwordsMismatch'))
          return 'Les mots de passe ne correspondent pas';
        break;
    }

    return '';
  }

  onSubmit(): void {
    this.submissionError = '';

    if (this.registerForm.valid) {
      this.isSubmitting = true;
      const { pseudo, email, password } = this.registerForm.value;

      this.authService.register(email, password, pseudo).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.submissionError = this.extractErrorMessage(error);
        },
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach((key) => {
      const control = this.registerForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
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

    return "Échec de l'inscription, veuillez réessayer.";
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
