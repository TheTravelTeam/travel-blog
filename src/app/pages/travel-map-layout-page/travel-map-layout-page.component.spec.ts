import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelMapLayoutPageComponent } from './travel-map-layout-page.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('TravelMapLayoutPageComponent', () => {
  let component: TravelMapLayoutPageComponent;
  let fixture: ComponentFixture<TravelMapLayoutPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravelMapLayoutPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TravelMapLayoutPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
