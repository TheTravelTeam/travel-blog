/* eslint-disable @typescript-eslint/no-empty-function */
import { Component, EventEmitter, forwardRef, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextInput, textInputDefault } from '@model/text-input';
import { FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { IconName } from '@model/icon.model';
import { IconComponent } from '../Icon/icon.component';

@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, ReactiveFormsModule],
  templateUrl: './text-input.component.html',
  styleUrl: './text-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextInputComponent),
      multi: true,
    },
  ],
})
export class TextInputComponent implements OnChanges {
  @Input() label?: TextInput['label'];
  @Input() placeholder?: TextInput['placeholder'];
  @Input() type: TextInput['type'] = textInputDefault['type'];
  @Input() size: TextInput['size'] = textInputDefault['size'];
  @Input() variant: TextInput['variant'] = textInputDefault['variant'];
  @Input() isDisabled: TextInput['isDisabled'] = textInputDefault['isDisabled'];
  @Input() isRequired: TextInput['isRequired'] = textInputDefault['isRequired'];
  @Input() helperText?: TextInput['helperText'];
  @Input() errorMessage?: TextInput['errorMessage'];
  @Input() maxLength?: TextInput['maxLength'];
  @Input() showCharCount: TextInput['showCharCount'] = textInputDefault['showCharCount'];
  @Input() icon?: IconName;
  @Input() iconPosition: TextInput['iconPosition'] = textInputDefault['iconPosition'];

  @Output() valueChange = new EventEmitter<string>();
  @Output() inputFocus = new EventEmitter<FocusEvent>();
  @Output() inputBlur = new EventEmitter<FocusEvent>();

  private _isFocused = false;
  private _inputId: string;
  private _showPassword = false;
  private _isDisabled: boolean | undefined = false;

  value = '';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onChange = (value: string) => {};
  private onTouched = () => {};

  constructor() {
    this._inputId = `text-input-${Math.random().toString(36).substring(2, 11)}`;
  }

  ngOnChanges(): void {
    this._isDisabled = this.isDisabled;
  }

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._isDisabled = isDisabled;
  }

  get isFocused(): boolean {
    return this._isFocused;
  }

  get hasError(): boolean {
    return !!this.errorMessage;
  }

  get hasValue(): boolean {
    return Boolean(this.value && this.value.length > 0);
  }

  get characterCount(): number {
    return this.value ? this.value.length : 0;
  }

  get shouldShowCharCount(): boolean {
    return Boolean(this.showCharCount && !!this.maxLength);
  }

  get inputId(): string {
    return this._inputId;
  }

  get isPasswordField(): boolean {
    return this.type === 'password';
  }

  get currentInputType(): string {
    if (this.isPasswordField) {
      return this._showPassword ? 'text' : 'password';
    }
    return this.type;
  }

  get passwordToggleIcon(): IconName {
    return this._showPassword ? 'visibility' : 'visibility_off';
  }

  get shouldShowPasswordToggle(): boolean {
    return this.isPasswordField && this.iconPosition === 'right';
  }

  get isInputDisabled(): boolean {
    return this._isDisabled as boolean;
  }

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.value = input.value;

    this.onChange(this.value);
    this.valueChange.emit(this.value);
  }

  onInputFocus(event: FocusEvent): void {
    this._isFocused = true;
    this.inputFocus.emit(event);
  }

  onInputBlur(event: FocusEvent): void {
    this._isFocused = false;
    this.inputBlur.emit(event);
  }

  togglePasswordVisibility(): void {
    if (this.isPasswordField) {
      this._showPassword = !this._showPassword;
    }
  }

  get containerClasses(): string[] {
    return [
      'text-input',
      `text-input--${this.size}`,
      `text-input--${this.variant}`,
      this.hasError ? 'text-input--error' : '',
      this.isDisabled ? 'text-input--disabled' : '',
      this.isFocused ? 'text-input--focused' : '',
      this.hasValue ? 'text-input--has-value' : '',
      this.icon || this.shouldShowPasswordToggle
        ? `text-input--with-icon-${this.iconPosition}`
        : '',
    ].filter(Boolean);
  }

  get inputClasses(): string[] {
    return [
      'text-input__field',
      this.icon || this.shouldShowPasswordToggle
        ? `text-input__field--with-icon-${this.iconPosition}`
        : '',
    ].filter(Boolean);
  }

  get labelClasses(): string[] {
    return [
      'text-input__label',
      this.isRequired ? 'text-input__label--required' : '',
      this.hasError ? 'text-input__label--error' : '',
    ].filter(Boolean);
  }
}
