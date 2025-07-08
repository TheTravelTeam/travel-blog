import { Component, Input } from '@angular/core';
import { IconComponent } from '../../icon/icon.component';
import { CommonModule } from '@angular/common';
import { verticalSlide } from '../../../animations/vertical-slide.animation';
import { accordionDefaultProps, AccordionProps } from '../../../model/accordion.model';

@Component({
  selector: 'app-accordion',
  imports: [CommonModule, IconComponent],
  templateUrl: './accordion.component.html',
  styleUrl: './accordion.component.scss',
  animations: [verticalSlide],
})
export class AccordionComponent {
  @Input({ required: true }) title!: AccordionProps['title'];
  @Input() date: AccordionProps['date'];
  @Input() isFilter: AccordionProps['isFilter'] = accordionDefaultProps['isFilter'];
  @Input() isOpen: AccordionProps['isOpen'] = accordionDefaultProps['isOpen'];
  @Input() subTitle: AccordionProps['subTitle'];

  onToggleOpen() {
    this.isOpen = !this.isOpen;
  }
}
