import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateStepFormComponent } from './create-step-form.component';
import { Step } from '@model/step.model';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('CreateStepFormComponent', () => {
  let component: CreateStepFormComponent;
  let fixture: ComponentFixture<CreateStepFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateStepFormComponent],
      providers: [provideAnimations(), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateStepFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function setValidBaseFormValues(options: { includeDates?: boolean } = {}): void {
    const { includeDates = true } = options;
    component.stepForm.patchValue({
      title: 'Nouvelle étape test',
      city: 'Paris',
      country: 'France',
      continent: 'Europe',
      latitude: '48.8566',
      longitude: '2.3522',
      description: 'Une description suffisamment longue',
      mediaUrl: '',
      startDate: includeDates ? '2024-07-14' : '',
      endDate: includeDates ? '2024-07-20' : '',
      themeId: null,
      themeIds: [],
    });
  }

  it('should normalize date inputs to ISO dates on submit', () => {
    setValidBaseFormValues();
    component.stepForm.patchValue({
      startDate: '2024-07-14',
      endDate: '2024-07-20',
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

  it('should block submission when date inputs are missing', () => {
    setValidBaseFormValues({ includeDates: false });

    const emitSpy = spyOn(component.submitStep, 'emit');

    component.handleSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.stepForm.get('startDate')?.errors?.['required']).toBeTrue();
    expect(component.stepForm.get('endDate')?.errors?.['required']).toBeTrue();
  });

  it('should normalise French-formatted dates before emission', () => {
    setValidBaseFormValues();
    component.stepForm.patchValue({ startDate: '14/07/2024', endDate: '20/07/2024' });

    const emitSpy = spyOn(component.submitStep, 'emit');

    component.handleSubmit();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy.calls.mostRecent().args[0]).toEqual(
      jasmine.objectContaining({
        startDate: '2024-07-14',
        endDate: '2024-07-20',
      })
    );
  });

  it('should keep location identity fields disabled to avoid manual edits', () => {
    expect(component.stepForm.get('city')?.disabled).toBeTrue();
    expect(component.stepForm.get('country')?.disabled).toBeTrue();
    expect(component.stepForm.get('continent')?.disabled).toBeTrue();
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
      themeIds: [3],
      themes: [{ id: 3, name: 'Nature', updatedAt: '2023-01-01' } as any],
    };

    component.populateFromStep(step);

    expect(component.stepForm.getRawValue()).toEqual(
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
        themeIds: [3],
      })
    );
    expect(component.stepEditorContent).toBe('Description existante');
  });
});
