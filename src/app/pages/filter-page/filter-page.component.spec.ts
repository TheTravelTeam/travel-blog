import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';

import { FilterPageComponent } from './filter-page.component';
import { BreakpointService } from '@service/breakpoint.service';
import { SearchService } from '@service/search.service';
import { TravelMapStateService } from '@service/travel-map-state.service';

const queryParams$ = new BehaviorSubject(convertToParamMap({}));

const routerStub: Partial<Router> = {
  url: '/travels',
  navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
};

const breakpointStub: Partial<BreakpointService> = {
  isMobile: signal(false),
  isTablet: signal(false),
  isMobileOrTablet: signal(false),
};

const searchServiceStub: Partial<SearchService> = {
  search: jasmine.createSpy('search').and.returnValue(of([])),
};

describe('FilterPageComponent', () => {
  let component: FilterPageComponent;
  let fixture: ComponentFixture<FilterPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterPageComponent, RouterTestingModule],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideAnimations(),
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParams$.asObservable() } },
        { provide: Router, useValue: routerStub },
        { provide: BreakpointService, useValue: breakpointStub },
        { provide: SearchService, useValue: searchServiceStub },
        TravelMapStateService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
