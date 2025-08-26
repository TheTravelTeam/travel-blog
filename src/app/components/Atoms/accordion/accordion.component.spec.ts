import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccordionComponent } from './accordion.component';
import { provideAnimations } from '@angular/platform-browser/animations';
describe('AccordionComponent', () => {
  let component: AccordionComponent;
  let fixture: ComponentFixture<AccordionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideAnimations()],
      imports: [AccordionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccordionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
