import { AlignItems, Color, JustifyContent, Radius } from './variant';

export const cardDefault: Card = {
  color: 'primary',
  radius: 'sm',
  isDisabled: false,
};

export interface Card {
  layout?: 'column' | 'row';
  color: Color;
  radius?: Radius;
  isDisabled?: boolean;
  isHoverable?: boolean;
  isClickable?: boolean;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
}
