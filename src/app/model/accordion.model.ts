export type AccordionProps = {
  title: string;
  date?: Date;
  isFilter: boolean;
  isOpen?: boolean;
  subTitle?: string;
};

export const accordionDefaultProps: Required<Omit<AccordionProps, 'title' | 'subTitle' | 'date'>> =
  {
    isFilter: false,
    isOpen: false,
  };
