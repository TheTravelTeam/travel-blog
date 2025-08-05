<<<<<<< HEAD:src/app/model/logo.model.ts
import { Color, IconSize, LogoSrc } from './variant';
=======
import { IconSize, LogoSrc } from './variant';
>>>>>>> 9f3504a (chore(KAN-251): refactor folders & rename several files, refactor components to Atomic Design structure):src/app/shared/model/logo.model.ts

export const logoDefault: Logo = {
  size: 'md',
  src: '/icon/logo.svg',
  alt: 'logoTravelBlog',
  ariaLabel: 'homepage',
<<<<<<< HEAD:src/app/model/logo.model.ts
  color: 'primary',
  logoName: 'x',
=======
>>>>>>> 9f3504a (chore(KAN-251): refactor folders & rename several files, refactor components to Atomic Design structure):src/app/shared/model/logo.model.ts
};

export type Logo = {
  src: LogoSrc;
  alt?: string;
  size?: IconSize;
<<<<<<< HEAD:src/app/model/logo.model.ts
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
=======
  ariaLabel: string;
};
>>>>>>> 9f3504a (chore(KAN-251): refactor folders & rename several files, refactor components to Atomic Design structure):src/app/shared/model/logo.model.ts
