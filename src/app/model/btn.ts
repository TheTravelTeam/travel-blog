import { IconName } from './icon';
import { Color, Radius, Size } from './variant';

export const btnDefault: Btn = {
  color: 'primary',
  type: 'standard',
  radius: 'border_lg',
  size: 'sm',
  text: '',
  isDisabled: false,
  startIcon: false,
  endIcon: false,
  isActionBtn: false,
  icon: 'add',
};

export interface Btn {
  color: Color;
  type: 'standard' | 'like' | 'comment';
  radius: Radius;
  size: Size;
  text: string;
  isDisabled: boolean;
  startIcon: boolean;
  endIcon: boolean;
  isActionBtn: boolean;
  icon: IconName;
}
