/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisualTripCardComponent } from './visual-trip-card.component';

describe('VisualTripCardComponent', () => {
  let component: VisualTripCardComponent;
  let fixture: ComponentFixture<VisualTripCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisualTripCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VisualTripCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
