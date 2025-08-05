import { Component, EventEmitter, HostBinding, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../Icon/icon.component';
import { Chip, chipDefault } from '@model/chip.model';

@Component({
  selector: 'app-chip',
  standalone: true,
  imports: [IconComponent, CommonModule],
  templateUrl: './chip.component.html',
  styleUrl: './chip.component.scss',
})
export class ChipComponent {
  @Input() startIcon?: Chip['startIcon'];
  @Input() startIconColor?: Chip['startIconColor'];
  @Input() endIcon?: Chip['endIcon'];
  @Input() endIconColor?: Chip['endIconColor'];
  @Input() closeButton?: Chip['closeButton'];
  @Input() textColor?: Chip['textColor'];
  @Input() children?: Chip['children'];
  @Input() gap: Chip['gap'] = chipDefault['gap'];
  @Input() radius: Chip['radius'];
  @Input() isDisabled: Chip['isDisabled'];
  @Input() isHoverable: Chip['isHoverable'];
  @Input() isClickable: Chip['isClickable'];
  @Input() justifyContent: Chip['justifyContent'] = chipDefault['justifyContent'];
  @Input() borderColor: Chip['borderColor'];
  @Input() borderWeight: Chip['borderWeight'];
  @Input() backgroundColor: Chip['backgroundColor'];
  @Input() shadow: Chip['shadow'];
  @Input() margin: Chip['margin'];
  @Input() padding: Chip['padding'];
  @Input() customClass?: Chip['customClass'];
  @Output() closeChip = new EventEmitter<void>();
  @Output() chipClick = new EventEmitter<void>();

  Onclose(event: Event): void {
    event.stopPropagation();
    this.closeChip.emit();
  }

  @HostBinding('class') get classList(): string {
    return [
      'chip',
      'radius-' + this.radius,
      'gap-' + this.gap,
      'justify-' + this.justifyContent,
      'bg-' + this.backgroundColor,
      'border-' + this.borderColor,
      'border-' + this.borderWeight,
      'shadow-' + this.shadow,
      'margin-' + this.margin,
      'padding-' + this.padding,
      'text-' + this.textColor,
      this.isHoverable && !this.isDisabled ? 'hoverable' : '',
      this.isDisabled ? 'disabled' : '',
      this.isClickable && !this.isDisabled ? 'clickable' : '',
      this.customClass,
    ]
      .filter(Boolean)
      .join(' ');
  }

  @HostBinding('click') onClick() {
    if (!this.isDisabled) {
      this.chipClick.emit();
    }
  }
}
