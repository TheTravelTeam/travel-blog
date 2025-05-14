export type ChipProps = {
  id: string;
  text: string;
  color?: 'red' | 'green' | 'yellow';
  isClickable?: boolean;
};

export type ChipServiceProps = Required<Pick<ChipProps, 'isClickable'>>;

export type ChipEvents = {
  onClick: (e: Event) => void;
  onRemove: (e: Event) => void;
};
