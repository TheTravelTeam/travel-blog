import { AppColor, BorderWeight, JustifyContent, Radius, Shadow, Spacing } from './variant.model';

export const cardDefault: Required<
  Omit<
    Card,
    | 'textColor'
    | 'shadow'
    | 'backgroundColor'
    | 'isDisabled'
    | 'isHoverable'
    | 'isClickable'
    | 'width'
    | 'height'
    | 'margin'
    | 'padding'
    | 'borderColor'
    | 'customClass'
  >
> = {
  layout: 'column',
  radius: 'sm',
  justifyContent: 'center',
  borderWeight: 'thin',
};

export interface Card {
  width: string;
  height: string;
  margin?: Spacing;
  padding?: Spacing;
  layout?: 'column' | 'row';
  radius?: Radius;
  isDisabled?: boolean;
  isHoverable?: boolean;
  isClickable?: boolean;
  justifyContent?: JustifyContent;
  backgroundColor?: AppColor;
  borderColor?: AppColor;
  borderWeight?: BorderWeight;
  textColor?: AppColor;
  shadow?: Shadow;
  customClass?: string;
}
