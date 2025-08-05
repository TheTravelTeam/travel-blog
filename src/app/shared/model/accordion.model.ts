export type AccordionProps = {
  title: string;
  date?: Date;
  id?: number | string;
  isEditing: boolean;
  isFilter?: boolean;
  isOpen?: boolean;
  role: 'admin' | 'owner' | 'reader';
  subTitle?: string;
};

export const accordionDefaultProps: Required<
  Omit<AccordionProps, 'id' | 'title' | 'subTitle' | 'date'>
> = {
  isEditing: false,
  isFilter: false,
  isOpen: false,
  role: 'reader',
};
