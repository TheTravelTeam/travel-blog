import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterPageComponent } from './filter-page.component';
import { provideAnimations } from '@angular/platform-browser/animations';

describe('FilterPageComponent', () => {
  let component: FilterPageComponent;
  let fixture: ComponentFixture<FilterPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterPageComponent],
      providers: [
        provideAnimations(), // 👈 Ajoute ça pour corriger l’erreur
        // ...autres providers éventuels
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
