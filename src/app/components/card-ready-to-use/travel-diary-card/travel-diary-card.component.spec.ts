import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelDiaryCardComponent } from './travel-diary-card.component';

describe('TravelDiaryCardComponent', () => {
  let component: TravelDiaryCardComponent;
  let fixture: ComponentFixture<TravelDiaryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravelDiaryCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TravelDiaryCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
