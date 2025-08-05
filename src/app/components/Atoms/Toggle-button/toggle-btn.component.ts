import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ToggleButton, toggleButtonDefault } from '@model/toggle-btn.model';

@Component({
  selector: 'app-toggle-btn',
  imports: [CommonModule],
  templateUrl: './toggle-btn.component.html',
  styleUrl: './toggle-btn.component.scss',
})
export class ToggleBtnComponent {
  @Input({ required: true }) label!: ToggleButton['label'];
  @Input() state: ToggleButton['state'] = toggleButtonDefault['state'];
  @Input() isDisabled: ToggleButton['isDisabled'] = toggleButtonDefault['isDisabled'];
  @Input() color: ToggleButton['color'] = toggleButtonDefault['color'];

  toggle(): void {
    if (!this.isDisabled) {
      this.state = this.state === 'on' ? 'off' : 'on';
    }
  }

  get classes(): string[] {
    return [
      'toggle-btn',
      `toggle-btn--${this.state}-${this.color}`,
      this.isDisabled ? 'toggle-btn--disabled' : '',
    ];
  }
}
