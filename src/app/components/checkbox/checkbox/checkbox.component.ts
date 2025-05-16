import { Component, Input } from '@angular/core';
import { Checkbox, checkboxDefault } from '../../../model/checkbox';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss',
})
export class CheckboxComponent {
  @Input() checkboxName: Checkbox['checkboxName'] = checkboxDefault['checkboxName'];
  @Input() icon: Checkbox['icon'] = checkboxDefault['icon'];
  @Input() isDisabled: Checkbox['isDisabled'] = checkboxDefault['isDisabled'];
}
