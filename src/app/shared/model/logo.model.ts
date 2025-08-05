import { IconSize, LogoSrc } from './variant';

export const logoDefault: Logo = {
  size: 'md',
  src: '/icon/logo.svg',
  alt: 'logoTravelBlog',
  ariaLabel: 'homepage',
};

export type Logo = {
  src: LogoSrc;
  alt?: string;
  size?: IconSize;
  ariaLabel: string;
};
