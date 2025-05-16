export const checkboxDefault: Checkbox = {
  checkboxName: 'firstChoice',
  icon: 'check',
  isDisabled: false,
};

export interface Checkbox {
  checkboxName: string;
  icon: 'check' | 'remove' | '';
  isDisabled: boolean;
}
