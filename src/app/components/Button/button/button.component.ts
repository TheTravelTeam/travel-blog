import { Component, inject, Input } from '@angular/core';
import { ButtonService } from '../button.service';
import { CommonModule } from '@angular/common';
import { Btn, btnDefault } from '../../../model/btn';
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
  @Input() size: Btn['size'] = btnDefault['size'];
  @Input() isDisabled: Btn['isDisabled'] = btnDefault['isDisabled'];
  @Input() text: Btn['text'] = btnDefault['text'];
  @Input() startIcon: Btn['startIcon'] = btnDefault['startIcon'];
  @Input() endIcon: Btn['endIcon'] = btnDefault['endIcon'];
  @Input() isActionBtn: Btn['isActionBtn'] = btnDefault['isActionBtn'];
  @Input() type: Btn['type'] = btnDefault['type'];
  @Input() icon: Btn['icon'] = btnDefault['icon'];

  onClick() {
    this.buttonService.clickEvent();
  }
}
