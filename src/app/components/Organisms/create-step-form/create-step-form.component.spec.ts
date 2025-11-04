/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateStepFormComponent } from './create-step-form.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  createStepFormBaseValues,
  createStepFormFrenchDateValues,
  existingStepFixture,
  invalidCoordinateValues,
} from './create-step-form.mock';

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
    const baseValues = {
      ...createStepFormBaseValues,
      startDate: includeDates ? createStepFormBaseValues.startDate : '',
      endDate: includeDates ? createStepFormBaseValues.endDate : '',
    };
    component.stepForm.patchValue(baseValues);
  }

  it('TC-STEP-FRM-01 should normalise dates and emit numeric coordinates on submit', async () => {
    setValidBaseFormValues();
    component.stepForm.patchValue(createStepFormFrenchDateValues);

    const emitSpy = spyOn(component.submitStep, 'emit');

    await component.handleSubmit();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    const payload = emitSpy.calls.mostRecent()?.args?.[0] as any;
    expect(payload).toBeDefined();
    if (!payload) {
      fail('Expected emitted payload');
      return;
    }
    expect(payload).toEqual(
      jasmine.objectContaining({
        startDate: '2024-07-14',
        endDate: '2024-07-20',
        latitude: 48.8566,
        longitude: 2.3522,
      })
    );
    expect(typeof payload.latitude).toBe('number');
    expect(typeof payload.longitude).toBe('number');
  });

  it('TC-STEP-FRM-02 should block submission when date inputs are missing', () => {
    setValidBaseFormValues({ includeDates: false });

    const emitSpy = spyOn(component.submitStep, 'emit');

    component.handleSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.stepForm.get('startDate')?.errors?.['required']).toBeTrue();
    expect(component.stepForm.get('endDate')?.errors?.['required']).toBeTrue();
    expect(component.getControlError('startDate')).toBe('Sélectionnez une date de départ');
    expect(component.getControlError('endDate')).toBe('Sélectionnez une date de fin');
  });

  it('TC-STEP-FRM-03 should populate the form from a Step instance and sync the editor', () => {
    component.populateFromStep(existingStepFixture);

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
        startDate: '2024-07-14',
        endDate: '2024-07-20',
        themeId: 3,
      })
    );
    expect(component.stepEditorContent).toBe('Description existante');
    expect(component.stepForm.get('city')?.disabled).toBeTrue();
    expect(component.stepForm.get('country')?.disabled).toBeTrue();
    expect(component.stepForm.get('continent')?.disabled).toBeTrue();
  });

  it('TC-STEP-FRM-04 should keep location identity fields disabled to avoid manual edits', () => {
    expect(component.stepForm.get('city')?.disabled).toBeTrue();
    expect(component.stepForm.get('country')?.disabled).toBeTrue();
    expect(component.stepForm.get('continent')?.disabled).toBeTrue();
  });

  it('should prevent submission when coordinates cannot be parsed', () => {
    setValidBaseFormValues();
    component.stepForm.patchValue(invalidCoordinateValues);

    const emitSpy = spyOn(component.submitStep, 'emit');

    component.handleSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.stepForm.get('latitude')?.errors?.['invalid']).toBeTrue();
    expect(component.stepForm.get('longitude')?.errors?.['invalid']).toBeTrue();
  });
});
