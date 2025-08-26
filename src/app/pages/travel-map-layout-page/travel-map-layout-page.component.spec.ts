import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelMapLayoutPageComponent } from './travel-map-layout-page.component';

describe('TravelMapLayoutPageComponent', () => {
  let component: TravelMapLayoutPageComponent;
  let fixture: ComponentFixture<TravelMapLayoutPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravelMapLayoutPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TravelMapLayoutPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
