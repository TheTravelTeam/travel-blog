export const checkboxDefault: Required<Omit<Checkbox, 'checkboxName' | 'label'>> = {
  icon: 'check',
  isDisabled: false,
};

export type Checkbox = {
  checkboxName: string;
  label?: string;
  icon?: 'check' | 'remove' | '';
  isDisabled?: boolean;
};
