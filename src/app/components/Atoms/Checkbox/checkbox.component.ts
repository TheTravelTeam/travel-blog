import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Checkbox, checkboxDefault } from '../../model/checkbox';

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
}
