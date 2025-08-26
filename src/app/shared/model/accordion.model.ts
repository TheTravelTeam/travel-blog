export type AccordionProps = {
  title: string;
  startDate?: Date;
  id?: number;
  isEditing: boolean;
  isFilter?: boolean;
  isOpen?: boolean;
  role: 'admin' | 'owner' | 'reader';
  country?: string;
};

export const accordionDefaultProps: Required<
  Omit<AccordionProps, 'id' | 'title' | 'country' | 'startDate'>
> = {
  isEditing: false,
  isFilter: false,
  isOpen: false,
  role: 'reader',
};
