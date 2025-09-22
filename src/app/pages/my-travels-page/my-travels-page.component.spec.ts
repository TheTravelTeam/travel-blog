import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MyTravelsPageComponent } from './my-travels-page.component';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { environment } from '../../../environments/environment';
import { TravelDiary } from '@model/travel-diary.model';

describe('MyTravelsPageComponent', () => {
  let component: MyTravelsPageComponent;
  let fixture: ComponentFixture<MyTravelsPageComponent>;
  let httpMock: HttpTestingController;

  const paramMap$ = new BehaviorSubject(convertToParamMap({ id: '1' }));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyTravelsPageComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyTravelsPageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
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
});
