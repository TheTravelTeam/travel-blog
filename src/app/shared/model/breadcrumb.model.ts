import { IconColor } from './variant';

export type BreadcrumbItem = {
  label: string;
  href: string;
  isDisabled?: boolean;
};

export const breadcrumbDefault: Required<Omit<BreadcrumbItem, 'label' | 'href'>> = {
  isDisabled: false,
};

export const iconColorDefault: IconColor = 'text';
