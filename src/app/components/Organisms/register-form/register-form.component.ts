import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
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
export class RegisterFormComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  registerForm!: FormGroup;
  isSubmitting = false;

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
        pseudo: ['', [Validators.required]],
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
        if (this.registerForm.hasError('passwordsMismatch')) return 'Les mots de passe ne correspondent pas';
        break;
    }

    return '';
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isSubmitting = true;
      const { pseudo, email, password } = this.registerForm.value;

      this.authService.register(email, password, pseudo).subscribe({
        next: () => this.router.navigate(['/login']),
        error: () => {
          this.isSubmitting = false;
          alert("Échec de l'inscription, veuillez réessayer.");
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

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
