import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorldMapPageComponent } from './diary-page.component';
import { provideRouter } from '@angular/router';

describe('WorldMapPageComponent', () => {
  let component: WorldMapPageComponent;
  let fixture: ComponentFixture<WorldMapPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorldMapPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(WorldMapPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
