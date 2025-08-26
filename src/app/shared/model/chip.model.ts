import { IconName } from './icon.model';
import {
  AppColor,
  BorderWeight,
  IconColor,
  JustifyContent,
  Radius,
  Shadow,
  Spacing,
} from './variant.model';

export const chipDefault: Required<
  Omit<
    Chip,
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
    | 'startIcon'
    | 'endIcon'
    | 'closeButton'
    | 'children'
    | 'borderColor'
    | 'borderWeight'
    | 'endIconColor'
    | 'startIconColor'
    | 'radius'
    | 'customClass'
  >
> = {
  justifyContent: 'center',
  gap: 'xs',
};

export interface Chip {
  gap: Spacing;
  margin?: Spacing;
  padding?: Spacing;
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
  startIcon?: IconName;
  startIconColor: IconColor;
  endIconColor: IconColor;
  endIcon?: IconName;
  closeButton: boolean;
  children: string;
  customClass: string;
}
