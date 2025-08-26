import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorldMapPageComponent } from './world-map-page.component';

describe('WorldMapPageComponent', () => {
  let component: WorldMapPageComponent;
  let fixture: ComponentFixture<WorldMapPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorldMapPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WorldMapPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
