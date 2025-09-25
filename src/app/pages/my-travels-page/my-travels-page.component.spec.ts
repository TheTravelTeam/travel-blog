import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MyTravelsPageComponent } from './my-travels-page.component';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { TravelDiary } from '@model/travel-diary.model';
import { StepService } from '@service/step.service';
import {
  importProvidersFrom,
  runInInjectionContext,
  EnvironmentInjector,
  signal,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CreateDiaryModalComponent } from 'components/Organisms/create-diary-modal/create-diary-modal.component';
import { ThemeService } from '@service/theme.service';
import { AuthService } from '@service/auth.service';
import { UserProfileDto } from '@dto/user-profile.dto';

class AuthServiceStub {
  currentUser = signal<UserProfileDto | null>(null);

  setCurrentUser(user: UserProfileDto | null) {
    this.currentUser.set(user);
  }
}

describe('MyTravelsPageComponent', () => {
  let component: MyTravelsPageComponent;
  let fixture: ComponentFixture<MyTravelsPageComponent>;
  let httpMock: HttpTestingController;
  let router: Router;
  let stepServiceSpy: jasmine.SpyObj<StepService>;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;
  let authServiceStub: AuthServiceStub;

  const paramMap$ = new BehaviorSubject(convertToParamMap({ id: '1' }));

  beforeEach(async () => {
    authServiceStub = new AuthServiceStub();
    //Utile si tu veux tester des cas liés à l’utilisateur connecté (par ex. : vérifier qu’un utilisateur ne peut pas supprimer un diary qui ne lui appartient pas → là tu auras besoin de currentUserId)
    authServiceStub.setCurrentUser({
      id: 1,
      pseudo: 'mock',
      firstName: 'Mock',
      lastName: 'User',
      roles: ['ROLE_USER'],
      travelDiaries: [],
    });
    stepServiceSpy = jasmine.createSpyObj<StepService>('StepService', [
      'deleteDiary',
      'addDiary',
      'addStepToTravel',
    ]);
    stepServiceSpy.deleteDiary.and.returnValue(of(void 0));
    themeServiceSpy = jasmine.createSpyObj<ThemeService>('ThemeService', ['getThemes']);
    themeServiceSpy.getThemes.and.returnValue(of([]));

    TestBed.overrideComponent(CreateDiaryModalComponent, {
      set: {
        template: '',
        imports: [],
      },
    });

    await TestBed.configureTestingModule({
      imports: [MyTravelsPageComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        importProvidersFrom(ReactiveFormsModule),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable(),
          },
        },
        { provide: StepService, useValue: stepServiceSpy },
        { provide: ThemeService, useValue: themeServiceSpy },
        { provide: AuthService, useValue: authServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyTravelsPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    const injector = TestBed.inject(EnvironmentInjector);

    runInInjectionContext(injector, () => {
      component.ngOnInit();
    });

    const mockDiaries: TravelDiary[] = [
      {
        id: 1,
        title: 'Mock Diary',
        latitude: 0,
        longitude: 0,
        private: false,
        published: true,
        status: 'DRAFT',
        description: 'Diary used for tests',
        steps: [],
        user: {
          id: 1,
          avatar: 'null',
          biography: 'null',
          enabled: true,
          status: 'ACTIVE',
          userName: 'mock',
          username: 'mock@example.com',
        },
        media: null,
      },
    ];

    httpMock.expectOne(`${environment.apiUrl}/users/1`).flush({
      id: 1,
      pseudo: 'mock',
      firstName: 'Mock',
      lastName: 'User',
      email: 'mock@example.com',
      biography: null,
      avatar: null,
      status: 'ACTIVE',
      enabled: true,
      roles: ['ROLE_USER'],
      createdAt: '',
      updatedAt: '',
      travelDiaries: mockDiaries,
    });
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update shared state when a diary card is clicked', () => {
    const diary = component.diariesList[0];
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    component.onDiaryCardClick(diary);

    expect(component.state.currentDiaryId()).toBe(diary.id);
    expect(component.state.currentDiary()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/travels', diary.id]);
    expect(component.panelError).toBeNull();
  });

  it('should open edit modal with prefilled data on edit action', () => {
    const diary = component.diariesList[0];

    // On espionne la navigation pour vérifier qu'elle n'est PAS appelée
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    // Act
    component.onDiaryEdit(diary);

    // Assert: pas de navigation
    expect(navigateSpy).not.toHaveBeenCalled();

    // Assert: ouverture de la modale en mode édition
    expect(component.isEditMode).toBeTrue();
    expect(component.isCreateModalOpen).toBeTrue();
    expect(component.createModalError).toBeNull();
    expect(component.isCreateModalSubmitting).toBeFalse();

    // Assert: pré-remplissage des champs de la modale
    expect(component.editInitialDiary).toEqual({
      title: diary.title ?? '',
      description: diary.description ?? '',
      coverUrl: diary.media?.fileUrl ?? null, // ton mock a media: null => null ici
    });

    // Assert: le state courant est positionné sur le diary édité
    expect(component.state.currentDiaryId()).toBe(diary.id);
    expect(component.state.currentDiary()).toBe(diary);

    // Optionnel: si ensureThemesLoaded() doit charger les thèmes, on peut vérifier l'appel
    expect(themeServiceSpy.getThemes).toHaveBeenCalled();
  });

  it('should delete a diary and call the service', () => {
    const diary = component.diariesList[0];
    component.onDiaryDelete(diary);

    expect(stepServiceSpy.deleteDiary).toHaveBeenCalledWith(diary.id);
    expect(component.diariesList.length).toBe(0);
    expect(component.state.currentDiaryId()).toBeNull();
    expect(component.state.panelHeight()).toBe('collapsed');
    expect(component.panelError).toBeNull();
  });

  it('should restore diaries when deletion fails', () => {
    const diary = component.diariesList[0];
    stepServiceSpy.deleteDiary.and.returnValue(throwError(() => new Error('delete failed')));

    component.onDiaryDelete(diary);

    expect(component.diariesList.length).toBe(1);
    expect(component.panelError).toBe('Impossible de supprimer ce carnet pour le moment.');
  });
});
