import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { LoginFormComponent } from './login-form.component';
import { AuthService } from '@service/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

describe('LoginFormComponent', () => {
  let component: LoginFormComponent;
  let fixture: ComponentFixture<LoginFormComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, LoginFormComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ToastService, useValue: toastService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the form with the expected controls', () => {
    expect(component).toBeTruthy();
    expect(component.loginForm.get('email')).toBeTruthy();
    expect(component.loginForm.get('password')).toBeTruthy();
    expect(component.loginForm.valid).toBeFalse();
  });

  it('returns the required error for email when missing', () => {
    const emailControl = component.loginForm.get('email');
    emailControl?.markAsTouched();
    emailControl?.setErrors({ required: true });

    expect(component.getErrorMessage('email')).toBe("L'email est requis");
  });

  it('returns the invalid email error when format is wrong', () => {
    const emailControl = component.loginForm.get('email');
    emailControl?.markAsTouched();
    emailControl?.setErrors({ email: true });

    expect(component.getErrorMessage('email')).toBe("L'email n'est pas valide");
  });

  it('marks fields touched and skips login when form is invalid', () => {
    component.onSubmit();

    expect(authService.login).not.toHaveBeenCalled();
    expect(component.loginForm.get('email')?.touched).toBeTrue();
    expect(component.loginForm.get('password')?.touched).toBeTrue();
  });

  it('propagates backend error messages to the UI', () => {
    authService.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ error: 'Identifiants invalides', status: 401 }))
    );

    component.loginForm.setValue({ email: 'john@doe.com', password: 'password123' });

    component.onSubmit();

    expect(component.submissionError).toBe('Identifiants invalides');
    expect(toastService.error).toHaveBeenCalledWith('Identifiants invalides');
    expect(component.isSubmitting).toBeFalse();
  });

  it('falls back to a generic message when backend has none', () => {
    authService.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    component.loginForm.setValue({ email: 'john@doe.com', password: 'password123' });

    component.onSubmit();

    expect(component.submissionError).toBe('Échec de la connexion, veuillez vérifier vos identifiants.');
    expect(toastService.error).toHaveBeenCalledWith(
      'Échec de la connexion, veuillez vérifier vos identifiants.'
    );
    expect(component.isSubmitting).toBeFalse();
  });

  it('navigates to travels on success and clears submissionError', () => {
    authService.login.and.returnValue(of('ok'));

    component.loginForm.setValue({ email: 'john@doe.com', password: 'password123' });
    component.submissionError = 'Old error';

    component.onSubmit();

    expect(router.navigate).toHaveBeenCalledWith(['travels']);
    expect(component.submissionError).toBe('');
    expect(component.isSubmitting).toBeFalse();
  });

  it('navigates to the signup page when requested', () => {
    component.navigateToSignup();

    expect(router.navigate).toHaveBeenCalledWith(['/register']);
  });

  it('navigates to the forgot password page when requested', () => {
    component.navigateToForgotPassword();

    expect(router.navigate).toHaveBeenCalledWith(['/forgot-password']);
  });
});
