import { Color } from './variant';

export type Link = {
  label: string;
  route: string;
  color: Color;
  icon:
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
    | 'account_circle'
    | 'auto_stories'
    | 'map_search'
    | 'travel_explore'
    | 'chat_bubble';
};

export const linkDefault: Link = {
  label: 'home',
  route: '/',
  color: 'white',
  icon: 'hiking',
};
