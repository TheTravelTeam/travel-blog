import { Color, Radius, Size } from './variant';

export const btnDefault: Btn = {
  color: 'primary',
  radius: 'sm',
  size: 'sm',
  isDisabled: false,
};

export interface Btn {
  color: Color;
  radius: Radius;
  size: Size;
  isDisabled: boolean;
}
