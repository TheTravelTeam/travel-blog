import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import {
  EnvironmentInjector,
  importProvidersFrom,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { MyTravelsPageComponent } from './my-travels-page.component';
import { TravelDiary } from '@model/travel-diary.model';
import {
  CreateDiaryModalComponent,
  DiaryCreationPayload,
} from 'components/Organisms/create-diary-modal/create-diary-modal.component';
import { StepService } from '@service/step.service';
import { ThemeService } from '@service/theme.service';
import { MediaService } from '@service/media.service';
import { AuthService } from '@service/auth.service';
import { UserProfileDto } from '@dto/user-profile.dto';
import { environment } from '../../../environments/environment';

class AuthServiceStub {
  currentUser = signal<UserProfileDto | null>(null);

  setCurrentUser(user: UserProfileDto | null): void {
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
  let mediaServiceSpy: jasmine.SpyObj<MediaService>;
  let authServiceStub: AuthServiceStub;

  const paramMap$ = new BehaviorSubject(convertToParamMap({ id: '1' }));

  beforeEach(async () => {
    authServiceStub = new AuthServiceStub();
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
      'updateDiary',
    ]);
    stepServiceSpy.deleteDiary.and.returnValue(of(void 0));
    stepServiceSpy.updateDiary.and.returnValue(of({} as TravelDiary));

    themeServiceSpy = jasmine.createSpyObj<ThemeService>('ThemeService', ['getThemes']);
    themeServiceSpy.getThemes.and.returnValue(of([]));

    mediaServiceSpy = jasmine.createSpyObj<MediaService>('MediaService', [
      'createDiaryMedia',
      'createStepMedia',
    ]);
    mediaServiceSpy.createDiaryMedia.and.returnValue(
      of({
        id: 42,
        fileUrl: 'https://example.com/new-cover.png',
        mediaType: 'PHOTO',
        createdAt: '',
        updatedAt: '',
        status: 'VISIBLE',
      } as any)
    );
    mediaServiceSpy.createStepMedia.and.returnValue(of({} as any));

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
        { provide: MediaService, useValue: mediaServiceSpy },
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
          pseudo: 'mock',
          avatar: null,
          biography: null,
          enabled: true,
          status: 'ACTIVE',
          email: 'mock@example.com',
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
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    component.onDiaryEdit(diary);

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.isEditMode).toBeTrue();
    expect(component.isCreateModalOpen).toBeTrue();
    expect(component.createModalError).toBeNull();
    expect(component.isCreateModalSubmitting).toBeFalse();
    expect(component.editInitialDiary).toEqual({
      title: diary.title ?? '',
      description: diary.description ?? '',
      coverUrl: diary.media?.fileUrl ?? null,
    });
    expect(component.state.currentDiaryId()).toBe(diary.id);
    expect(component.state.currentDiary()).toEqual(jasmine.objectContaining({ id: diary.id }));
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

  it('should include media payload when saving a diary edition with cover url', () => {
    const diary = component.diariesList[0];
    component.onDiaryEdit(diary);

    const updatedCoverUrl = ' https://example.com/new-cover.png ';
    const payload: DiaryCreationPayload = {
      diary: {
        title: 'Updated title',
        travelPeriod: null,
        coverUrl: updatedCoverUrl,
        description: 'Updated description',
        isPrivate: true,
        isPublished: true,
        status: 'COMPLETED',
        canComment: true,
      },
      step: {
        title: '',
        city: null,
        country: null,
        continent: null,
        latitude: diary.latitude,
        longitude: diary.longitude,
        description: '',
        mediaUrl: null,
        startDate: null,
        endDate: null,
        themeId: null,
        themeIds: [],
      },
    };

    stepServiceSpy.updateDiary.and.returnValue(
      of({
        ...diary,
        title: payload.diary.title,
        description: payload.diary.description,
        media: {
          createdAt: '',
          updatedAt: '',
          status: 'VISIBLE',
          id: 1,
          fileUrl: updatedCoverUrl.trim(),
          mediaType: 'PHOTO',
        },
      })
    );

    component.onDiaryModalSubmit(payload);

    expect(mediaServiceSpy.createDiaryMedia).toHaveBeenCalledWith(
      jasmine.objectContaining({
        fileUrl: updatedCoverUrl.trim(),
        mediaType: 'PHOTO',
        travelDiaryId: diary.id,
      })
    );

    expect(stepServiceSpy.updateDiary).toHaveBeenCalledWith(
      diary.id,
      jasmine.objectContaining({
        title: payload.diary.title,
        description: payload.diary.description,
        isPrivate: payload.diary.isPrivate,
        isPublished: payload.diary.isPublished,
        status: payload.diary.status,
        canComment: payload.diary.canComment,
      })
    );
  });
});
