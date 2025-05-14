import { Component, inject, Input } from '@angular/core';
import { ButtonService } from '../button.service';
import { CommonModule } from '@angular/common';
import { Btn } from '../../../model/variant';
import { btnDefault } from '../../../model/btn';
@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  private buttonService: ButtonService = inject(ButtonService);

  @Input() color: Btn['color'] = btnDefault['color'];
  @Input() radius: Btn['radius'] = btnDefault['radius'];
  // // @Input() variant: Variant = 'primary';
  // @Input() radius: Radius = 'sm';
  @Input() size: Btn['size'] = 'md';
  @Input() isDisabled = btnDefault['isDisabled'];

  onClick() {
    this.buttonService.clickEvent();
  }
}
