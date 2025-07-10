import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
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
export class AccordionComponent implements OnChanges {
  /**region Input */
  @Input({ required: true }) title!: AccordionProps['title'];
  @Input() date: AccordionProps['date'];
  @Input() id: AccordionProps['id'];
  @Input() isEditing: AccordionProps['isEditing'] = accordionDefaultProps['isEditing'];
  @Input() isFilter: AccordionProps['isFilter'] = accordionDefaultProps['isFilter'];
  @Input() isOpen: AccordionProps['isOpen'] = accordionDefaultProps['isOpen'];
  @Input() role: AccordionProps['role'] = accordionDefaultProps['role'];
  @Input() subTitle: AccordionProps['subTitle'];
  /**endregion Input */

  /**region Output */
  @Output() isEditingChange = new EventEmitter<boolean>();
  @Output() remove = new EventEmitter<void>();
  /**region Output */

  onToggleOpen() {
    this.isOpen = !this.isOpen;
  }

  onToggleEdit(e: Event) {
    e.stopPropagation();
    this.isEditing = !this.isEditing;
    this.isEditingChange.emit(this.isEditing);
  }

  onDelete(e: Event) {
    e.stopPropagation();
    this.remove.emit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isEditing']) this.isOpen = this.isEditing;
  }
}
