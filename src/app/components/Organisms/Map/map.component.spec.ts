import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapComponent } from './map.component';
import { provideHttpClient } from '@angular/common/http';

describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapComponent],
      providers: [
        provideHttpClient(),
        // d'autres providers éventuels ici
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
