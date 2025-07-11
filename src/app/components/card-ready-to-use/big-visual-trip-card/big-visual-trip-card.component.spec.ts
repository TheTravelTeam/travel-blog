import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BigVisualTripCardComponent } from './big-visual-trip-card.component';

describe('BigVisualTripCardComponent', () => {
  let component: BigVisualTripCardComponent;
  let fixture: ComponentFixture<BigVisualTripCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BigVisualTripCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BigVisualTripCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
