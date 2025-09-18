import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@service/auth.service';
import { TextInputComponent } from '../../Atoms/text-input/text-input.component';
import { ButtonComponent } from '../../Atoms/Button/button.component';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule, TextInputComponent, ButtonComponent],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss',
})
export class LoginFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authservice = inject(AuthService);
  private toast = inject(ToastService);

  loginForm!: FormGroup;
  isSubmitting = false;

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.loginForm.get(fieldName);
    if (!control || !control.errors || !control.touched) return '';

    const errors = control.errors;

    switch (fieldName) {
      case 'email':
        if (errors['required']) return "L'email est requis";
        if (errors['email']) return "L'email n'est pas valide";
        break;
      case 'password':
        if (errors['required']) return 'Le mot de passe est requis';
        if (errors['minlength']) return 'Le mot de passe doit contenir au moins 8 caractères';
        break;
    }

    return '';
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isSubmitting = true;
      const { email, password } = this.loginForm.value;

      this.authservice.login(email, password).subscribe({
        next: () => this.router.navigate(['travels']),
        error: () => {
          this.isSubmitting = false;
          this.toast.error('Échec de la connexion, veuillez vérifier vos identifiants.');
        },
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach((key) => {
      const control = this.loginForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  navigateToSignup(): void {
    this.router.navigate(['/register']);
  }

  navigateToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }
}
