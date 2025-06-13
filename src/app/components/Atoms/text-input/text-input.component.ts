import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextInput, textInputDefault } from '../../../model/text-input';
import { FormsModule } from '@angular/forms';
import { IconName } from '../../../model/icon';
import { IconComponent } from '../../icon/icon.component';

@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './text-input.component.html',
  styleUrl: './text-input.component.scss',
})
export class TextInputComponent {
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

  @Input() value = '';
  private _isFocused = false;
  private _inputId: string;

  constructor() {
    this._inputId = `text-input-${Math.random().toString(36).substring(2, 11)}`;
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

  onInputFocus(event: FocusEvent): void {
    this._isFocused = true;
    this.inputFocus.emit(event);
  }

  onInputBlur(event: FocusEvent): void {
    this._isFocused = false;
    this.inputBlur.emit(event);
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
      this.icon ? `text-input--with-icon-${this.iconPosition}` : '',
    ].filter(Boolean);
  }

  get inputClasses(): string[] {
    return [
      'text-input__field',
      this.icon ? `text-input__field--with-icon-${this.iconPosition}` : '',
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
