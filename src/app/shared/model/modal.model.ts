export type ModalProps = {
  title: string;
  description: string;
  rightButtonLabel: string;
  leftButtonLabel?: string;
  isDangerModal?: boolean;
};

export const modalDefaultProps: Required<
  Omit<ModalProps, 'title' | 'description' | 'rightButtonLabel'>
> = {
  leftButtonLabel: 'Annuler',
  isDangerModal: false,
};
