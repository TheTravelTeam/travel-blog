import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { ForgotPasswordFormComponent } from './forgot-password-form.component';
import { AuthService } from '@service/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

describe('ForgotPasswordFormComponent', () => {
  let component: ForgotPasswordFormComponent;
  let fixture: ComponentFixture<ForgotPasswordFormComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastSpy: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['requestPasswordReset']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordFormComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordFormComponent);
    component = fixture.componentInstance;
    authServiceSpy.requestPasswordReset.and.returnValue(of(void 0));
    fixture.detectChanges();
  });

  it('should create and initialize the email control', () => {
    expect(component).toBeTruthy();
    expect(component.forgotPasswordForm.get('email')).toBeTruthy();
    expect(component.forgotPasswordForm.valid).toBeFalse();
  });

  it('should provide required email error', () => {
    const control = component.forgotPasswordForm.get('email');
    control?.markAsTouched();
    control?.setErrors({ required: true });

    expect(component.getErrorMessage('email')).toBe("L'email est requis");
  });

  it('should mark control touched and not call service when form invalid', () => {
    component.onSubmit();

    expect(authServiceSpy.requestPasswordReset).not.toHaveBeenCalled();
    expect(component.forgotPasswordForm.get('email')?.touched).toBeTrue();
  });

  it('should call service, set requestSent and notify on success', fakeAsync(() => {
    component.forgotPasswordForm.setValue({ email: 'user@example.com' });

    component.onSubmit();
    tick();

    expect(authServiceSpy.requestPasswordReset).toHaveBeenCalledWith('user@example.com');
    expect(component.requestSent).toBeTrue();
    expect(component.submissionError).toBe('');
    expect(component.isSubmitting).toBeFalse();
    expect(toastSpy.success).toHaveBeenCalled();
  }));

  it('surfaces backend validation errors when available', fakeAsync(() => {
    authServiceSpy.requestPasswordReset.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              errors: {
                email: ["L'email est invalide"],
              },
            },
          })
      )
    );
    component.forgotPasswordForm.setValue({ email: 'user@example.com' });

    component.onSubmit();
    tick();

    expect(toastSpy.error).toHaveBeenCalledWith("L'email est invalide");
    expect(component.submissionError).toBe("L'email est invalide");
    expect(component.isSubmitting).toBeFalse();
    expect(component.requestSent).toBeFalse();
  }));

  it('falls back to generic message when backend is silent', fakeAsync(() => {
    authServiceSpy.requestPasswordReset.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.forgotPasswordForm.setValue({ email: 'user@example.com' });

    component.onSubmit();
    tick();

    expect(toastSpy.error).toHaveBeenCalledWith(
      "Impossible d'envoyer le lien. Veuillez réessayer plus tard."
    );
    expect(component.submissionError).toBe(
      "Impossible d'envoyer le lien. Veuillez réessayer plus tard."
    );
    expect(component.isSubmitting).toBeFalse();
    expect(component.requestSent).toBeFalse();
  }));

  it('should navigate back to login when requested', () => {
    component.navigateToLogin();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
