import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';

import { TopBarComponent } from './top-bar.component';
import { BreakpointService } from '@service/breakpoint.service';
import { AuthService } from '@service/auth.service';
import { SearchService } from '@service/search.service';

const breakpointServiceStub: Partial<BreakpointService> = {
  isMobile: signal(false),
  isTablet: signal(false),
  isMobileOrTablet: signal(false),
  isDesktop: signal(true),
};

const authServiceStub: Partial<AuthService> = {
  currentUser: signal(null),
  loadCurrentUser: jasmine.createSpy('loadCurrentUser').and.returnValue(of(null)),
  logout: jasmine.createSpy('logout').and.returnValue(of(void 0)),
};

const searchServiceStub: Partial<SearchService> = {
  search: jasmine.createSpy('search').and.returnValue(of([])),
};

describe('TopBarComponent', () => {
  let component: TopBarComponent;
  let fixture: ComponentFixture<TopBarComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopBarComponent, RouterTestingModule],
      providers: [
        { provide: BreakpointService, useValue: breakpointServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: SearchService, useValue: searchServiceStub },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(TopBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
