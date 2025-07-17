import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelMapLayoutComponent } from './travel-map-layout.component';

describe('TravelMapLayoutComponent', () => {
  let component: TravelMapLayoutComponent;
  let fixture: ComponentFixture<TravelMapLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravelMapLayoutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TravelMapLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
