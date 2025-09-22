import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MyTravelsPageComponent } from './my-travels-page.component';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { TravelDiary } from '@model/travel-diary.model';
import { StepService } from '@service/step.service';

describe('MyTravelsPageComponent', () => {
  let component: MyTravelsPageComponent;
  let fixture: ComponentFixture<MyTravelsPageComponent>;
  let httpMock: HttpTestingController;
  let router: Router;
  let stepServiceSpy: jasmine.SpyObj<StepService>;

  const paramMap$ = new BehaviorSubject(convertToParamMap({ id: '1' }));

  beforeEach(async () => {
    stepServiceSpy = jasmine.createSpyObj<StepService>('StepService', ['deleteDiary']);
    stepServiceSpy.deleteDiary.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [MyTravelsPageComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable(),
          },
        },
        { provide: StepService, useValue: stepServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyTravelsPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();

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

    httpMock
      .expectOne(`${environment.apiUrl}/users/1`)
      .flush({
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

  it('should navigate to diary page on edit action', async () => {
    const diary = component.diariesList[0];
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    await component.onDiaryEdit(diary);

    expect(navigateSpy).toHaveBeenCalledWith(['/travels', diary.id], { queryParams: { mode: 'edit' } });
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
