/// <reference types="jasmine" />

import { ComponentFixture, TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
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

const routerNavigateSpy = routerStub.navigate as jasmine.Spy;

const activatedRouteStub = {
  queryParamMap: queryParams$.asObservable(),
} as Partial<ActivatedRoute>;

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
    routerNavigateSpy.calls.reset();
    (searchServiceStub.search as jasmine.Spy).calls.reset();
    queryParams$.next(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [FilterPageComponent, RouterTestingModule],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        provideAnimations(),
        { provide: ActivatedRoute, useValue: activatedRouteStub },
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

  it('updates search control when query param changes', fakeAsync(() => {
    queryParams$.next(convertToParamMap({ q: 'asia' }));
    tick();
    fixture.detectChanges();

    expect(component.searchControl.value).toBe('asia');
    expect(searchServiceStub.search as jasmine.Spy).toHaveBeenCalledWith('asia');
  }));

  it('navigates with trimmed query when search value changes', fakeAsync(() => {
    component.searchControl.setValue('  peru  ');
    tick(200);
    flushMicrotasks();

    expect(routerNavigateSpy).toHaveBeenCalledWith([], {
      relativeTo: activatedRouteStub,
      queryParams: { q: 'peru' },
      queryParamsHandling: 'merge',
    });
  }));

  it('removes query param when search value cleared', fakeAsync(() => {
    component.searchControl.setValue('tokyo');
    tick(200);
    flushMicrotasks();
    routerNavigateSpy.calls.reset();

    component.searchControl.setValue('');
    tick(200);
    flushMicrotasks();

    expect(routerNavigateSpy).toHaveBeenCalledWith([], {
      relativeTo: activatedRouteStub,
      queryParams: { q: null },
      queryParamsHandling: 'merge',
    });
  }));

  it('clears search immediately when clearSearchQuery is called', fakeAsync(() => {
    component.searchControl.setValue('lisbonne', { emitEvent: false });

    component.clearSearchQuery();
    flushMicrotasks();

    expect(component.searchControl.value).toBe('');
    expect(component.activeSearchQuery()).toBe('');
    expect(component.searchResults()).toEqual([]);
    expect(routerNavigateSpy).toHaveBeenCalledWith([], {
      relativeTo: activatedRouteStub,
      queryParams: { q: null },
      queryParamsHandling: 'merge',
    });
  }));
});
