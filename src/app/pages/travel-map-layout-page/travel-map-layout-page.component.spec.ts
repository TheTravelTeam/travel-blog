import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { TravelMapLayoutPageComponent } from './travel-map-layout-page.component';
import { TravelMapStateService } from '@service/travel-map-state.service';
import { Step } from '@model/step.model';
import { TravelDiary } from '@model/travel-diary.model';

describe('TravelMapLayoutPageComponent', () => {
  let component: TravelMapLayoutPageComponent;
  let fixture: ComponentFixture<TravelMapLayoutPageComponent>;
  let state: TravelMapStateService;
  let navigate: (url: string) => void;
  let routerStub: any;

  beforeEach(async () => {
    const routerEvents$ = new Subject<NavigationEnd>();
    routerStub = {
      url: '/travels',
      events: routerEvents$.asObservable(),
      navigate: jasmine.createSpy('navigate'),
      navigateByUrl: jasmine.createSpy('navigateByUrl'),
    };

    await TestBed.configureTestingModule({
      imports: [TravelMapLayoutPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TravelMapLayoutPageComponent);
    component = fixture.componentInstance;
    state = TestBed.inject(TravelMapStateService);
    navigate = (component as unknown as { handleNavigation(url: string): void }).handleNavigation.bind(
      component
    );
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('keeps panel expanded when url contains search query', () => {
    state.panelHeight.set('expanded');

    navigate('/travels?q=rome');

    expect(state.panelHeight()).toBe('expanded');
  });

  it('collapses panel when url has no search query', () => {
    state.panelHeight.set('expanded');

    navigate('/travels');

    expect(state.panelHeight()).toBe('collapsed');
  });

  it('keeps the diary panel expanded when a matching step is requested via query param', () => {
    routerStub.url = '/travels/42?step=2';

    const steps: Step[] = [
      {
        id: 1,
        title: 'First',
        description: '',
        latitude: 10,
        longitude: 20,
        media: [],
        country: 'FR',
        city: 'Paris',
        continent: 'Europe',
        startDate: null,
        endDate: null,
        status: 'IN_PROGRESS',
        themeIds: [],
        themes: [],
        isEditing: false,
        comments: [],
        likes: 0,
      },
      {
        id: 2,
        title: 'Second',
        description: '',
        latitude: 30,
        longitude: 40,
        media: [],
        country: 'US',
        city: 'NYC',
        continent: 'America',
        startDate: null,
        endDate: null,
        status: 'IN_PROGRESS',
        themeIds: [],
        themes: [],
        isEditing: false,
        comments: [],
        likes: 0,
      },
    ];

    const diary: TravelDiary = {
      id: 42,
      title: 'Diary',
      latitude: 0,
      longitude: 0,
      private: false,
      published: true,
      status: 'ACTIVE',
      description: '',
      steps,
      user: { id: 1, pseudo: 'User' },
      media: null,
      canComment: true,
    };

    component.onDiarySelected({ diary, steps });

    expect(state.openedStepId()).toBe(2);
    expect(state.panelHeight()).toBe('expanded');
    expect(state.mapCenterCoords()).toBeNull();
  });

  it('falls back to the first step and collapses the panel when no step query is provided', () => {
    routerStub.url = '/travels/42';

    const steps: Step[] = [
      {
        id: 1,
        title: 'Only',
        description: '',
        latitude: 15,
        longitude: 25,
        media: [],
        country: 'FR',
        city: 'Lyon',
        continent: 'Europe',
        startDate: null,
        endDate: null,
        status: 'IN_PROGRESS',
        themeIds: [],
        themes: [],
        isEditing: false,
        comments: [],
        likes: 0,
      },
    ];

    const diary: TravelDiary = {
      id: 42,
      title: 'Diary',
      latitude: 0,
      longitude: 0,
      private: false,
      published: true,
      status: 'ACTIVE',
      description: '',
      steps,
      user: { id: 1, pseudo: 'User' },
      media: null,
      canComment: true,
    };

    component.onDiarySelected({ diary, steps });

    expect(state.openedStepId()).toBe(1);
    expect(state.panelHeight()).toBe('expanded');
    expect(state.mapCenterCoords()).toBeNull();
  });

  it('collapses the panel when the requested step does not exist', () => {
    routerStub.url = '/travels/42?step=99';

    const steps: Step[] = [
      {
        id: 1,
        title: 'First',
        description: '',
        latitude: 5,
        longitude: 6,
        media: [],
        country: 'FR',
        city: 'Nice',
        continent: 'Europe',
        startDate: null,
        endDate: null,
        status: 'IN_PROGRESS',
        themeIds: [],
        themes: [],
        isEditing: false,
        comments: [],
        likes: 0,
      },
    ];

    const diary: TravelDiary = {
      id: 42,
      title: 'Diary',
      latitude: 0,
      longitude: 0,
      private: false,
      published: true,
      status: 'ACTIVE',
      description: '',
      steps,
      user: { id: 1, pseudo: 'User' },
      media: null,
      canComment: true,
    };

    component.onDiarySelected({ diary, steps });

    expect(state.openedStepId()).toBe(1);
    expect(state.panelHeight()).toBe('expanded');
    expect(state.mapCenterCoords()).toBeNull();
  });

  it('keeps the panel expanded when navigating directly to a diary route', () => {
    state.panelHeight.set('collapsed');

    navigate('/travels/77');

    expect(state.panelHeight()).toBe('expanded');
  });

  it('keeps the panel expanded when navigating to a user diaries route', () => {
    state.panelHeight.set('collapsed');

    navigate('/travels/users/12');

    expect(state.panelHeight()).toBe('expanded');
  });
});
