export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerColor = 'default' | 'primary' | 'secondary' | 'danger' | 'white';
export type DividerThickness = 'thin' | 'medium' | 'thick';
export type DividerMargin = 'sm' | 'md' | 'lg';
export type DividerRadius = '5' | '10' | '15' | '';

export type Divider = {
  orientation?: DividerOrientation;
  color?: DividerColor;
  thickness?: DividerThickness;
  margin?: DividerMargin;
  isOpenMobile: boolean;
  radius: DividerRadius;
};

export const dividerDefault: Divider = {
  orientation: 'horizontal',
  color: 'default',
  thickness: 'medium',
  margin: 'sm',
  isOpenMobile: false,
  radius: '',
};
