export type TextInputType =
  | 'text'
  | 'password'
  | 'email'
  | 'tel'
  | 'url'
  | 'search'
  | 'datetime-local'
  | 'date';
export type TextInputSize = 'small' | 'medium' | 'large';
export type TextInputVariant = 'outlined' | 'filled';
export type IconPosition = 'left' | 'right';

export interface TextInputModel {
  label?: string;
  placeholder: string;
  type: TextInputType;
  size: TextInputSize;
  variant: TextInputVariant;
  isDisabled?: boolean;
  isRequired?: boolean;
  helperText?: string;
  errorMessage?: string;
  maxLength?: number;
  showCharCount?: boolean;
  icon?: string;
  iconPosition: IconPosition;
  autocomplete?: string;
}

export const textInputDefault: Required<
  Omit<TextInputModel, 'label' | 'placeholder' | 'errorMessage' | 'maxLength' | 'icon'>
> = {
  type: 'text',
  size: 'medium',
  variant: 'outlined',
  isDisabled: false,
  isRequired: false,
  showCharCount: false,
  iconPosition: 'left',
  helperText: '',
  autocomplete: '',
};
