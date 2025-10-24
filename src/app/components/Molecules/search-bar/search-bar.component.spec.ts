/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { SearchBarComponent } from './search-bar.component';

describe('SearchBarComponent', () => {
  let component: SearchBarComponent;
  let fixture: ComponentFixture<SearchBarComponent>;
  let control: FormControl<string>;

  beforeEach(async () => {
    control = new FormControl('', { nonNullable: true });

    await TestBed.configureTestingModule({
      imports: [SearchBarComponent, ReactiveFormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;
    component.control = control;
    fixture.detectChanges();
  });

  it('should emit the trimmed value on submit', () => {
    const submitSpy = jasmine.createSpy('submit');
    component.searchSubmit.subscribe(submitSpy);

    control.setValue('  bangkok  ');
    fixture.detectChanges();

    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));

    expect(submitSpy).toHaveBeenCalledOnceWith('bangkok');
  });

  it('should show clear button when value is present and emit clear on click', () => {
    const clearSpy = jasmine.createSpy('clear');
    component.clear.subscribe(clearSpy);

    control.setValue('Lisbonne');
    fixture.detectChanges();

    const clearButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.search-bar__clear');
    expect(clearButton).not.toBeNull();

    clearButton?.click();
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit focus and blur events', () => {
    const focusSpy = jasmine.createSpy('focus');
    const blurSpy = jasmine.createSpy('blur');
    component.searchFocus.subscribe(focusSpy);
    component.searchBlur.subscribe(blurSpy);

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    input.dispatchEvent(new FocusEvent('focus'));
    input.dispatchEvent(new FocusEvent('blur'));

    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(blurSpy).toHaveBeenCalledTimes(1);
  });
});
