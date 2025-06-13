export type SelectProps = {
  items: ItemProps[];
  label: string;
  placeholder: string;
  disabled?: boolean;
  withMultipleSelect?: boolean;
  maxSelectionMessage?: string;
};

export type ItemProps = {
  id: number;
  label: string;
};

export const selectDefaultProps: Required<Omit<SelectProps, 'label' | 'items'>> = {
  disabled: false,
  placeholder: 'Sélectionnez...',
  withMultipleSelect: false,
  maxSelectionMessage: 'limite de choix atteinte.',
};
