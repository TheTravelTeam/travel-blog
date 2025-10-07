import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

import { RegisterFormComponent } from './register-form.component';
import { AuthService } from '@service/auth.service';

describe('RegisterFormComponent', () => {
  let component: RegisterFormComponent;
  let fixture: ComponentFixture<RegisterFormComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['register']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [RegisterFormComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initialises the form with validators', () => {
    expect(component).toBeTruthy();
    expect(component.registerForm.get('pseudo')).toBeTruthy();
    expect(component.registerForm.get('email')).toBeTruthy();
    expect(component.registerForm.get('password')).toBeTruthy();
    expect(component.registerForm.get('confirmPassword')).toBeTruthy();
    expect(component.registerForm.valid).toBeFalse();
  });

  it('returns the required error for pseudo when empty', () => {
    const pseudoControl = component.registerForm.get('pseudo');
    pseudoControl?.markAsTouched();
    pseudoControl?.setErrors({ required: true });

    expect(component.getErrorMessage('pseudo')).toBe('Le pseudo est requis');
  });

  it('returns a minlength error when pseudo is too short', () => {
    const pseudoControl = component.registerForm.get('pseudo');
    pseudoControl?.markAsTouched();
    pseudoControl?.setErrors({ minlength: { requiredLength: 3, actualLength: 2 } });

    expect(component.getErrorMessage('pseudo')).toBe('Le pseudo doit contenir au moins 3 caractères');
  });

  it('flags password mismatch when confirmation differs', () => {
    component.registerForm.patchValue({
      pseudo: 'Traveler',
      email: 'user@example.com',
      password: '123456',
      confirmPassword: 'abcdef',
    });
    component.registerForm.get('confirmPassword')?.markAsTouched();
    component.registerForm.updateValueAndValidity();

    expect(component.registerForm.hasError('passwordsMismatch')).toBeTrue();
    expect(component.getErrorMessage('confirmPassword')).toBe('Les mots de passe ne correspondent pas');
  });

  it('marks controls as touched when submitting an invalid form', () => {
    component.onSubmit();

    expect(authService.register).not.toHaveBeenCalled();
    expect(component.registerForm.get('pseudo')?.touched).toBeTrue();
    expect(component.registerForm.get('email')?.touched).toBeTrue();
    expect(component.registerForm.get('password')?.touched).toBeTrue();
    expect(component.registerForm.get('confirmPassword')?.touched).toBeTrue();
  });

  function fillForm(): void {
    component.registerForm.setValue({
      pseudo: 'Jane',
      email: 'jane@doe.com',
      password: 'azerty1',
      confirmPassword: 'azerty1',
    });
  }

  it('surfaces backend error messages on failure', () => {
    authService.register.and.returnValue(
      throwError(() => new HttpErrorResponse({ error: { message: 'Adresse déjà utilisée' }, status: 409 }))
    );

    fillForm();
    component.onSubmit();

    expect(component.submissionError).toBe('Adresse déjà utilisée');
    expect(component.isSubmitting).toBeFalse();
  });

  it('extracts field-level validation messages when provided', () => {
    authService.register.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              errors: {
                pseudo: ['Le nom d\'utilisateur est obligatoire'],
                email: "L'email est invalide",
              },
            },
          })
      )
    );

    fillForm();
    component.onSubmit();

    expect(component.submissionError).toBe("Le nom d'utilisateur est obligatoire");
    expect(component.isSubmitting).toBeFalse();
  });

  it('falls back to a generic message when backend payload is empty', () => {
    authService.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    fillForm();
    component.onSubmit();

    expect(component.submissionError).toBe("Échec de l'inscription, veuillez réessayer.");
    expect(component.isSubmitting).toBeFalse();
  });

  it('navigates to login on success and clears errors', () => {
    authService.register.and.returnValue(of(void 0));

    fillForm();
    component.submissionError = 'Ancienne erreur';

    component.onSubmit();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(component.submissionError).toBe('');
    expect(component.isSubmitting).toBeFalse();
  });

  it('submits the form values to the auth service when valid', () => {
    authService.register.and.returnValue(of(void 0));

    fillForm();

    component.onSubmit();

    expect(authService.register).toHaveBeenCalledWith('jane@doe.com', 'azerty1', 'Jane');
  });

  it('navigates back to login when navigateToLogin is called', () => {
    component.navigateToLogin();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
