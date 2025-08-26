import { Color, IconSize, LogoSrc } from './variant.model';

export const logoDefault: Logo = {
  size: 'md',
  src: '/icon/logo.svg',
  alt: 'logoTravelBlog',
  ariaLabel: 'homepage',
  color: 'primary',
  logoName: 'x',
};

export type Logo = {
  src: LogoSrc;
  alt?: string;
  size?: IconSize;
  color?: Color;
  ariaLabel: string;
  logoName: string;
};

export interface LogoItem {
  svg: string;
  url: string;
}
export interface LogosType {
  x: LogoItem;
  youtube: LogoItem;
  instagram: LogoItem;
  linkedin: LogoItem;
  [key: string]: LogoItem;
  // peux utiliser n’importe quelle clé de type string, et ça retourne un string. »
}
