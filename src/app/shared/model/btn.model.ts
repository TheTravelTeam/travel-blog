import { IconName } from './icon.model';
import { Color, RadiusButton, Size } from './variant.model';

export const btnDefault: Btn = {
  color: 'primary',
  type: 'standard',
  radius: 'border_lg',
  size: 'auto',
  text: '',
  isDisabled: false,
  startIcon: false,
  endIcon: false,
  isActionBtn: false,
  icon: 'add',
  htmlType: 'submit',
};

export interface Btn {
  color: Color;
  type: 'standard' | 'like' | 'comment';
  radius: RadiusButton;
  size: Size;
  text: string;
  isDisabled: boolean;
  startIcon: boolean;
  endIcon: boolean;
  isActionBtn: boolean;
  icon: IconName;
  htmlType?: 'button' | 'submit' | 'reset';
}
