import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { verticalSlide } from '../../../animations/vertical-slide.animation';
import { accordionDefaultProps, AccordionProps } from '@model/accordion.model';
import { IconComponent } from '../Icon/icon.component';
import { ClickOutsideDirective } from 'shared/directives/click-outside.directive';

@Component({
  selector: 'app-accordion',
  imports: [CommonModule, IconComponent, ClickOutsideDirective],
  templateUrl: './accordion.component.html',
  styleUrl: './accordion.component.scss',
  animations: [verticalSlide],
  encapsulation: ViewEncapsulation.None,
})
export class AccordionComponent implements OnChanges {
  /**region Input */
  @Input({ required: true }) title!: AccordionProps['title'];
  // @Input() startDate: AccordionProps['startDate'];
  @Input() id: AccordionProps['id'];
  @Input() isEditing: AccordionProps['isEditing'] = accordionDefaultProps['isEditing'];
  @Input() isFilter: AccordionProps['isFilter'] = accordionDefaultProps['isFilter'];
  @Input() isOpen: AccordionProps['isOpen'] = accordionDefaultProps['isOpen'];
  @Input() role: AccordionProps['role'] = accordionDefaultProps['role'];
  @Input() subTitle: AccordionProps['country'];
  @Input()
  set startDate(value: Date | string | undefined) {
    this._startDate = value ? new Date(value) : undefined;
  }
  get startDate(): Date | undefined {
    return this._startDate;
  }
  /**endregion Input */

  private _startDate: Date | undefined;

  /**region Output */
  @Output() isEditingChange = new EventEmitter<boolean>();
  @Output() remove = new EventEmitter<void>();
  @Output() toggleOpen = new EventEmitter<boolean>();
  @Output() stepClicked = new EventEmitter<number>();
  /**region Output */

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isEditing']) this.isOpen = this.isEditing;
    if (changes['isOpen']) {
      this.isOpen = changes['isOpen'].currentValue;
    }
  }

  get formattedDate(): string | undefined {
    if (!this.startDate) return undefined;
    const month = this.startDate.toLocaleString('en-US', { month: 'short' });
    const day = this.startDate.getDate();
    const year = this.startDate.getFullYear();
    return `${month} ${day} ${year}`;
  }
  public onToggleOpen(): void {
    this.isOpen = !this.isOpen;
    this.toggleOpen.emit(this.isOpen);
  }

  public onToggleEdit(e: Event): void {
    e.stopPropagation();
    this.isEditing = !this.isEditing;
    this.isEditingChange.emit(this.isEditing);
  }

  public onDelete(e: Event): void {
    e.stopPropagation();
    this.remove.emit();
  }

  public onStepClick(): void {
    if (this.id) {
      this.stepClicked.emit(this.id);
    }
  }

  public closeDropdown(): void {
    if (this.isFilter) this.isOpen = false;
  }
}
