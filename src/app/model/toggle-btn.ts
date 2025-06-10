export type ToggleState = 'on' | 'off';

export interface ToggleButton {
  label: string;
  state: ToggleState;
  isDisabled?: boolean;
  color?: 'primary' | 'secondary' | 'white';
}

export const toggleButtonDefault: Required<Omit<ToggleButton, 'label'>> = {
  state: 'off',
  isDisabled: false,
  color: 'primary',
};
