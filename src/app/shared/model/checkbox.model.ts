export type Checkbox = {
  checkboxName: string;
  label?: string;
  icon?: 'check' | 'remove' | '';
  isDisabled?: boolean;
  checked?: boolean;
};

export const checkboxDefault: Required<Omit<Checkbox, 'checkboxName' | 'label'>> = {
  icon: 'check',
  isDisabled: false,
  checked: false,
};
