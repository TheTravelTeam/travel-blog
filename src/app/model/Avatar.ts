export type AvatarProps = {
  label: string;
  alt?: string;
  color?: 'mint' | 'lavender' | 'peach' | 'sweetLemon' | 'pink' | 'skyBlue';
  isInactive?: boolean;
  picture?: string;
  size?: 'default' | 'compact';
};

export const avatarDefaultProps: Required<Omit<AvatarProps, 'label' | 'picture'>> = {
  alt: 'Avatar',
  color: 'mint',
  isInactive: false,
  size: 'default',
};
