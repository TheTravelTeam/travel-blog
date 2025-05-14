import { Component, EventEmitter, inject, Input, Output, OnInit, OnChanges } from '@angular/core';
import { chipDefaultProps, ChipProps } from '../../../core';
import { ChipService } from './chip.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chip.component.html',
  styleUrl: './chip.component.scss',
  providers: [ChipService],
})
export class ChipComponent implements OnInit, OnChanges {
  // #region Input
  @Input({ required: true }) id!: ChipProps['id'];
  @Input({ required: true }) text!: ChipProps['text'];
  @Input() color: ChipProps['color'] = chipDefaultProps.color;
  @Input() isClickable: NonNullable<ChipProps['isClickable']> = chipDefaultProps.isClickable;
  // #endregion Input

  // #region Output
  @Output() public clickEvent = new EventEmitter();
  @Output() public removeEvent = new EventEmitter();
  // #endregion Output

  onClick(event: Event) {
    this.clickEvent.emit(event);
  }

  onRemove(event: Event) {
    this.removeEvent.emit(event);
  }

  chipService = inject(ChipService);

  ngOnInit() {
    this.chipService.initialize(
      {
        onClick: this.onClick.bind(this),
        onRemove: this.onRemove.bind(this),
      },
      {
        isClickable: this.isClickable,
      }
    );
  }

  ngOnChanges() {
    this.chipService.update({
      isClickable: this.isClickable,
    });
  }

  handleClick(e: Event) {
    e.stopPropagation();
    e.preventDefault();
    this.chipService.chipCore?.handleClick(e);
  }

  handleRemove(e: Event) {
    e.stopPropagation();
    this.chipService.chipCore?.handleRemove(e);
  }

  preventClick(e: Event) {
    e.preventDefault();
    e.stopPropagation();
  }
}
