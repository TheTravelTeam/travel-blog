/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MePageComponent } from './me-page.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { UserService } from '@service/user.service';
import { BreakpointService } from '@service/breakpoint.service';
import { AuthService } from '@service/auth.service';
import { StepService } from '@service/step.service';
import { of } from 'rxjs';
import { TravelDiary } from '@model/travel-diary.model';
import { UserProfile } from '@model/user-profile.model';
import { environment } from '../../../environments/environment';

class MockUserService {
  getCurrentUserProfile = jasmine
    .createSpy()
    .and.returnValue(of(mockProfile));
  currentUserId = jasmine.createSpy().and.returnValue(mockProfile.id);
  isCurrentUserDisabled = jasmine.createSpy().and.returnValue(false);
}

class MockBreakpointService {
  isMobileOrTablet = () => false;
}

class MockAuthService {
  clearToken = jasmine.createSpy();
}

class MockStepService {
  updateDiary = jasmine.createSpy('updateDiary').and.returnValue(of(mockDiaries[0]));
  deleteDiary = jasmine.createSpy('deleteDiary').and.returnValue(of(void 0));
}

const mockDiaries: TravelDiary[] = [
  {
    id: 1,
    title: 'Tour du monde',
    latitude: 0,
    longitude: 0,
    private: false,
    published: true,
    status: 'IN_PROGRESS',
    description: 'Une belle aventure',
    steps: [],
    user: {
      id: 42,
      pseudo: 'Alice',
      avatar: '',
      biography: 'Passionnée de voyages',
      enabled: true,
      status: 'ACTIVE',
      email: 'alice@example.com',
    },
    media: null,
  },
];

const mockProfile: UserProfile = {
  id: 42,
  pseudo: 'Alice',
  email: 'alice@example.com',
  biography: 'Passionnée de voyages',
  avatar: '',
  roles: ['USER', 'ADMIN'],
  enabled: true,
  travelDiaries: mockDiaries,
};

describe('MePageComponent', () => {
  let component: MePageComponent;
  let fixture: ComponentFixture<MePageComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MePageComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: UserService, useClass: MockUserService },
        { provide: BreakpointService, useClass: MockBreakpointService },
        { provide: AuthService, useClass: MockAuthService },
        { provide: StepService, useClass: MockStepService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MePageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/articles`).flush([]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the profile page', () => {
    expect(component).toBeTruthy();
  });

  it('should hydrate profile data and visible sections', () => {
    expect(component.isLoading()).toBeFalse();
    expect(component.profile()).toEqual(mockProfile);
    expect(component.diaries().length).toBe(1);
    expect(component.sections().map((section) => section.id)).toEqual([
      'info',
      'diaries',
      'articles',
      'users',
    ]);
  });
});

const nonAdminProfile: UserProfile = {
  id: 54,
  pseudo: 'Bob',
  email: 'bob@example.com',
  biography: 'Voyageur régulier',
  avatar: '',
  roles: ['USER'],
  enabled: true,
  travelDiaries: mockDiaries,
};

class MockNonAdminUserService {
  getCurrentUserProfile = jasmine.createSpy().and.returnValue(of(nonAdminProfile));
  currentUserId = jasmine.createSpy().and.returnValue(nonAdminProfile.id);
  isCurrentUserDisabled = jasmine.createSpy().and.returnValue(false);
}

describe('MePageComponent (non admin)', () => {
  let component: MePageComponent;
  let fixture: ComponentFixture<MePageComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MePageComponent],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: UserService, useClass: MockNonAdminUserService },
        { provide: BreakpointService, useClass: MockBreakpointService },
        { provide: AuthService, useClass: MockAuthService },
        { provide: StepService, useClass: MockStepService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MePageComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    httpMock.expectNone(`${environment.apiUrl}/articles`);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should hide article and admin sections for regular users', () => {
    const sectionIds = component.sections().map((section) => section.id);
    expect(sectionIds).toEqual(['info', 'diaries']);
    expect(component.isAdmin()).toBeFalse();
    expect(component.openSection()).toBe('info');
  });
});
