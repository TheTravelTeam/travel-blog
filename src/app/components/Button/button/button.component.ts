import { Component, inject } from '@angular/core';
import { ButtonService } from '../button.service';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  private buttonService: ButtonService = inject(ButtonService);

  onClick() {
    this.buttonService.clickEvent();
  }
}
