import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';

import { LoginFormComponent } from './login-form.component';
import { AuthService } from '@service/auth.service';
import { ToastService } from '../../../shared/services/toast.service'; // Service custom pour remplacer alert()

describe('LoginFormComponent', () => {
  let component: LoginFormComponent;
  let fixture: ComponentFixture<LoginFormComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastSpy = jasmine.createSpyObj('ToastService', ['error']);

    await TestBed.configureTestingModule({
      imports: [LoginFormComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginFormComponent);
    component = fixture.componentInstance;

    // Login réussit par défaut
    authServiceSpy.login.and.returnValue(of('token'));

    fixture.detectChanges();
  });

  it('should create and initialize form controls', () => {
    expect(component).toBeTruthy();
    expect(component.loginForm.get('email')).toBeTruthy();
    expect(component.loginForm.get('password')).toBeTruthy();
    expect(component.loginForm.valid).toBeFalse();
  });

  it('should provide the correct validation message for required email', () => {
    const emailControl = component.loginForm.get('email');
    emailControl?.markAsTouched();
    emailControl?.setErrors({ required: true });

    expect(component.getErrorMessage('email')).toBe("L'email est requis");
  });

  it('should provide the correct validation message for invalid email', () => {
    const emailControl = component.loginForm.get('email');
    emailControl?.markAsTouched();
    emailControl?.setErrors({ email: true });

    expect(component.getErrorMessage('email')).toBe("L'email n'est pas valide");
  });

  it('should mark fields as touched and not call login when form is invalid', () => {
    component.onSubmit();

    expect(authServiceSpy.login).not.toHaveBeenCalled();
    expect(component.loginForm.get('email')?.touched).toBeTrue();
    expect(component.loginForm.get('password')?.touched).toBeTrue();
  });

  it('should submit credentials and navigate on success', fakeAsync(() => {
    component.loginForm.setValue({
      email: 'user@example.com',
      password: '12345678',
    });

    fixture.detectChanges();
    component.onSubmit();
    tick(); // Simule la réponse async

    expect(routerSpy.navigate).toHaveBeenCalledWith(['travels']);
    expect(component.isSubmitting).toBeTrue();
  }));

  it('should show error and reset submitting state on login failure', fakeAsync(() => {
    authServiceSpy.login.and.returnValue(throwError(() => new Error('invalid')));

    component.loginForm.setValue({
      email: 'user@example.com',
      password: '12345678',
    });

    component.onSubmit();
    tick(); // Simule la réponse async

    expect(toastSpy.error).toHaveBeenCalledWith(
      'Échec de la connexion, veuillez vérifier vos identifiants.'
    );
    expect(component.isSubmitting).toBeFalse();
  }));

  it('should redirect to register page when navigateToSignup is called', () => {
    component.navigateToSignup();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/register']);
  });

  it('should redirect to forgot password page when navigateToForgotPassword is called', () => {
    component.navigateToForgotPassword();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/forgot-password']);
  });
});
