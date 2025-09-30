import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Checkbox, checkboxDefault } from '@model/checkbox.model';

@Component({
  selector: 'app-checkbox',
  imports: [CommonModule],
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss',
})
export class CheckboxComponent {
  @Input({ required: true }) checkboxName!: Checkbox['checkboxName'];
  @Input() label?: Checkbox['label'];
  @Input() icon: Checkbox['icon'] = checkboxDefault['icon'];
  @Input() isDisabled: Checkbox['isDisabled'] = checkboxDefault['isDisabled'];
  @Input() checked: Checkbox['checked'] = checkboxDefault['checked'];

  @Output() checkedChange = new EventEmitter<boolean>();

  onChange(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) {
      return;
    }

    this.checkedChange.emit(target.checked);
  }
}
