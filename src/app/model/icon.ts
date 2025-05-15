import { IconColor, IconSize } from './variant';

export const iconDefault: Icon = {
  name: 'help',
  size: 'sm',
  color: null,
  weight: 400,
  fill: false,
  grade: 0,
  customClass: '',
};

export interface Icon {
  name: IconName;
  size: IconSize;
  color: IconColor | null;
  weight: IconWeight;
  fill: boolean;
  grade: IconGrade;
  customClass: string;
}

export type IconName =
  | 'add'
  | 'close'
  | 'arrow_back'
  | 'remove'
  | 'chevron_right'
  | 'chevron_left'
  | 'keyboard_arrow_down'
  | 'keyboard_arrow_up'
  | 'search'
  | 'hiking'
  | 'favorite'
  | 'chat_bubble'
  | 'help'
  | 'info'
  | 'warning'
  | 'error'
  | 'check'
  | 'check_circle'
  | 'star'
  | 'delete'
  | 'edit'
  | 'visibility'
  | 'visibility_off';

export type IconWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700;
export type IconGrade = -25 | 0 | 200;
