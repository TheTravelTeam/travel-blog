import { animate, state, style, transition, trigger } from '@angular/animations';

export const modalAnimation = trigger('modalAnimation', [
  state('open', style({ opacity: 1, transform: 'translate(-50%, -50%) scale(1)' })),
  state('close', style({ opacity: 0, transform: 'translate(-50%, -50%) scale(1.1)' })),
  transition('close => open', animate('0.2s ease')),
  transition('open => close', animate('0.2s ease')),
]);
