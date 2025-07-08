import { trigger, state, style, transition, animate } from '@angular/animations';

export const verticalSlide = trigger('verticalSlide', [
  state(
    'close',
    style({
      height: '0px',
      opacity: 0,
      overflow: 'hidden',
    })
  ),
  state(
    'open',
    style({
      height: '*',
      opacity: 1,
      overflow: 'hidden',
    })
  ),
  transition('close <=> open', animate('0.4s ease')),
]);
