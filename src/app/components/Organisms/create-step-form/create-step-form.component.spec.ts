import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateStepFormComponent } from './create-step-form.component';
import { Step } from '@model/step.model';
import { provideAnimations } from '@angular/platform-browser/animations';

describe('CreateStepFormComponent', () => {
  let component: CreateStepFormComponent;
  let fixture: ComponentFixture<CreateStepFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateStepFormComponent],
      providers: [provideAnimations()]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateStepFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function setValidBaseFormValues(): void {
    component.stepForm.setValue({
      title: 'Nouvelle étape test',
      city: 'Paris',
      country: 'France',
      continent: 'Europe',
      latitude: '48.8566',
      longitude: '2.3522',
      description: 'Une description suffisamment longue',
      mediaUrl: '',
      startDate: '',
      endDate: '',
      themeId: null,
    });
  }

  it('should normalize datetime-local inputs to ISO dates on submit', () => {
    setValidBaseFormValues();
    component.stepForm.patchValue({
      startDate: '2024-07-14T12:30',
      endDate: '2024-07-20T08:15',
    });

    const emitSpy = spyOn(component.submitStep, 'emit');

    component.handleSubmit();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({
        startDate: '2024-07-14',
        endDate: '2024-07-20',
        latitude: 48.8566,
        longitude: 2.3522,
      })
    );
  });

  it('should emit null for empty date inputs on submit', () => {
    setValidBaseFormValues();

    const emitSpy = spyOn(component.submitStep, 'emit');

    component.handleSubmit();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({
        startDate: null,
        endDate: null,
      })
    );
  });

  it('should block submit when location fields are shorter than 2 characters', () => {
    setValidBaseFormValues();
    component.stepForm.patchValue({ city: 'A', country: 'B', continent: 'C' });

    const emitSpy = spyOn(component.submitStep, 'emit');

    component.handleSubmit();

    expect(component.stepForm.invalid).toBeTrue();
    expect(component.stepForm.get('city')?.errors?.['minlength']).toBeTruthy();
    expect(component.getControlError('city')).toContain('au moins');
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should populate the form from a Step instance', () => {
    const step: Step = {
      id: 12,
      title: 'Titre existant',
      description: 'Description existante',
      latitude: 12.34,
      longitude: 56.78,
      media: [{ id: 1, fileUrl: 'https://example.com/pic.jpg', mediaType: 'PHOTO' } as any],
      country: 'France',
      city: 'Paris',
      continent: 'Europe',
      startDate: '2024-07-14T10:00',
      endDate: '2024-07-20T16:30',
      status: 'IN_PROGRESS',
      themeId: 3,
      travelDiaryId: 5,
      isEditing: false,
      comments: [],
      likes: 0,
    };

    component.populateFromStep(step);

    expect(component.stepForm.value).toEqual(
      jasmine.objectContaining({
        title: 'Titre existant',
        city: 'Paris',
        country: 'France',
        continent: 'Europe',
        latitude: '12.34',
        longitude: '56.78',
        description: 'Description existante',
        mediaUrl: 'https://example.com/pic.jpg',
        startDate: '2024-07-14T10:00',
        endDate: '2024-07-20T16:30',
        themeId: 3,
      })
    );
    expect(component.stepEditorContent).toBe('Description existante');
  });
});
