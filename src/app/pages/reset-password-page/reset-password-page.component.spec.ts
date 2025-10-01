import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { ResetPasswordPageComponent } from './reset-password-page.component';
import { AuthService } from '@service/auth.service';
import { ToastService } from '../../shared/services/toast.service';

type ActivatedRouteWithSetter = ActivatedRoute & { setToken(value: string | null): void };

const createActivatedRouteStub = (): ActivatedRouteWithSetter => {
  const stub: any = {
    snapshot: {
      queryParamMap: convertToParamMap({}),
    },
    setToken(value: string | null) {
      this.snapshot.queryParamMap = convertToParamMap(value ? { token: value } : {});
    },
  };

  return stub as ActivatedRouteWithSetter;
};

describe('ResetPasswordPageComponent', () => {
  let component: ResetPasswordPageComponent;
  let fixture: ComponentFixture<ResetPasswordPageComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let toastSpy: jasmine.SpyObj<ToastService>;
  const activatedRouteStub = createActivatedRouteStub();

  const createComponent = () => {
    fixture = TestBed.createComponent(ResetPasswordPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['resetPassword']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info']);

    await TestBed.configureTestingModule({
      imports: [ResetPasswordPageComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToastService, useValue: toastSpy },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ],
    }).compileComponents();
  });

  it('should flag missing token on init', () => {
    activatedRouteStub.setToken(null);
    createComponent();

    expect(component.generalError).toBe('Lien invalide ou expiré.');
  });

  it('should submit the form and call resetPassword with the provided token', fakeAsync(() => {
    activatedRouteStub.setToken('token-123');
    authServiceSpy.resetPassword.and.returnValue(of(void 0));
    createComponent();

    component.resetForm.setValue({ password: '12345678', confirmPassword: '12345678' });

    component.onSubmit();
    tick();

    expect(authServiceSpy.resetPassword).toHaveBeenCalledWith('token-123', '12345678');
    expect(component.resetCompleted).toBeTrue();
    expect(toastSpy.success).toHaveBeenCalled();
  }));

  it('should surface backend validation errors on the password control', () => {
    activatedRouteStub.setToken('token-123');
    authServiceSpy.resetPassword.and.returnValue(
      throwError(() =>
        new HttpErrorResponse({
          status: 400,
          error: { errors: { password: ['Trop court'] } },
        })
      )
    );
    createComponent();

    component.resetForm.setValue({ password: '12345678', confirmPassword: '12345678' });

    component.onSubmit();

    expect(component.backendPasswordError).toBe('Trop court');
    expect(component.getPasswordErrorMessage()).toBe('Trop court');
    expect(component.generalError).toBe('');
  });

  it('should display API message when token is invalid or expired', () => {
    activatedRouteStub.setToken('token-123');
    authServiceSpy.resetPassword.and.returnValue(
      throwError(() =>
        new HttpErrorResponse({
          status: 400,
          error: { message: 'Token expiré.' },
        })
      )
    );
    createComponent();

    component.resetForm.setValue({ password: '12345678', confirmPassword: '12345678' });

    component.onSubmit();

    expect(component.generalError).toBe('Token expiré.');
    expect(component.resetCompleted).toBeFalse();
  });

  it('should navigate to login when navigateToLogin is called', () => {
    activatedRouteStub.setToken('token-123');
    authServiceSpy.resetPassword.and.returnValue(of(void 0));
    createComponent();

    component.navigateToLogin();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});
