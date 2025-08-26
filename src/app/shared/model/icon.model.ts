import { IconColor, IconSize } from '@model/variant.model';

export const iconDefault: Required<Omit<Icon, 'name'>> = {
  size: 'sm',
  color: null,
  weight: 400,
  fill: false,
  grade: 0,
  customClass: '',
};

export type Icon = {
  name: IconName;
  size?: IconSize;
  color?: IconColor | null;
  weight?: IconWeight;
  fill?: boolean;
  grade?: IconGrade;
  customClass?: string;
};

export type IconName =
  | 'add'
  | 'add_box'
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
  | 'edit_square'
  | 'edit'
  | 'visibility'
  | 'visibility_off'
  | 'import_contacts'
  | 'globe_location_pin'
  | 'language'
  | 'travel_explore'
  | 'map_search'
  | 'calendar_today'
  | 'location_on'
  | 'check_box_outline_blank'
  | 'disabled_by_default'
  | 'home'
  | 'account_circle'
  | 'explore'
  | 'travel';

export type IconWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700;
export type IconGrade = -25 | 0 | 200;
