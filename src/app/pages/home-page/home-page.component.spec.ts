/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { HomePageComponent } from './home-page.component';
<<<<<<< HEAD
import { StepService } from '@service/step.service';
import { ArticleService } from '@service/article.service';
import { BreakpointService } from '@service/breakpoint.service';
=======
import { provideRouter } from '@angular/router';
>>>>>>> 53e0e97 (feat(KAN-252): adding clickOutside directive  (#33))

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideRouter([]),
        {
          provide: StepService,
          useValue: {
            getAllDiaries: jasmine.createSpy('getAllDiaries').and.returnValue(of([])),
          },
        },
        {
          provide: ArticleService,
          useValue: {
            getArticles: jasmine.createSpy('getArticles').and.returnValue(of([])),
          },
        },
        {
          provide: BreakpointService,
          useValue: {
            isMobile: () => false,
            isTablet: () => false,
            isDesktop: () => true,
            isDesktopOrTablet: () => false,
            isMobileOrTablet: () => false,
            isLargeScreen: () => true,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
