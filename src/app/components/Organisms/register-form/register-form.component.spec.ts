/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';

import { RegisterFormComponent } from './register-form.component';
import { AuthService } from '@service/auth.service';

describe('RegisterFormComponent', () => {
  let component: RegisterFormComponent;
  let fixture: ComponentFixture<RegisterFormComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let alertSpy: jasmine.Spy;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['register']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [RegisterFormComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterFormComponent);
    component = fixture.componentInstance;
    alertSpy = spyOn(window, 'alert');
    authServiceSpy.register.and.returnValue(of(void 0));
    fixture.detectChanges();
  });

  it('should create the form with default validators', () => {
    expect(component).toBeTruthy();
    expect(component.registerForm.get('pseudo')?.validator).toBeTruthy();
    expect(component.registerForm.get('email')?.validator).toBeTruthy();
    expect(component.registerForm.get('password')?.validator).toBeTruthy();
    expect(component.registerForm.get('confirmPassword')?.validator).toBeTruthy();
    expect(component.registerForm.valid).toBeFalse();
  });

  it('should display required error for pseudo when missing', () => {
    component.registerForm.get('pseudo')?.markAsTouched();
    component.registerForm.get('pseudo')?.setErrors({ required: true });

    expect(component.getErrorMessage('pseudo')).toBe('Le pseudo est requis');
  });

  it('should display mismatch error when passwords differ', () => {
    component.registerForm.patchValue({
      pseudo: 'Traveler',
      email: 'user@example.com',
      password: '123456',
      confirmPassword: 'abcdef',
    });
    component.registerForm.get('confirmPassword')?.markAsTouched();
    component.registerForm.updateValueAndValidity();

    expect(component.registerForm.hasError('passwordsMismatch')).toBeTrue();
    expect(component.getErrorMessage('confirmPassword')).toBe(
      'Les mots de passe ne correspondent pas'
    );
  });

  it('should mark controls as touched when submitting invalid form', () => {
    component.onSubmit();

    expect(authServiceSpy.register).not.toHaveBeenCalled();
    expect(component.registerForm.get('pseudo')?.touched).toBeTrue();
    expect(component.registerForm.get('email')?.touched).toBeTrue();
    expect(component.registerForm.get('password')?.touched).toBeTrue();
    expect(component.registerForm.get('confirmPassword')?.touched).toBeTrue();
  });

  it('should submit and navigate when form is valid', () => {
    component.registerForm.setValue({
      pseudo: 'Traveler',
      email: 'user@example.com',
      password: '123456',
      confirmPassword: '123456',
    });

    component.onSubmit();

    expect(authServiceSpy.register).toHaveBeenCalledWith('user@example.com', '123456', 'Traveler');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    expect(component.isSubmitting).toBeTrue();
  });

  it('should alert and reset submitting state when backend returns an error', () => {
    authServiceSpy.register.and.returnValue(throwError(() => new Error('failure')));

    component.registerForm.setValue({
      pseudo: 'Traveler',
      email: 'user@example.com',
      password: '123456',
      confirmPassword: '123456',
    });

    component.onSubmit();

    expect(alertSpy).toHaveBeenCalledWith("Échec de l'inscription, veuillez réessayer.");
    expect(component.isSubmitting).toBeFalse();
  });

  it('should navigate back to login when navigateToLogin is called', () => {
    component.navigateToLogin();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
