import { DividerService } from './divider.service';
import { Component, Input, inject } from '@angular/core';
import { Divider, dividerDefault } from '../../model/divider';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-divider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './divider.component.html',
  styleUrl: './divider.component.scss',
})
export class DividerComponent {
  dividerService = inject(DividerService);
  @Input()
  orientation: Divider['orientation'] = dividerDefault['orientation'];
  @Input() color: Divider['color'] = dividerDefault['color'];
  @Input() thickness: Divider['thickness'] = dividerDefault['thickness'];
  @Input() margin: Divider['margin'] = dividerDefault['margin'];
  @Input() isOpenMobile: Divider['isOpenMobile'] = dividerDefault['isOpenMobile'];
  @Input() radius: Divider['radius'] = dividerDefault['radius'];

  get classes(): string[] {
    return this.dividerService.getClasses({
      orientation: this.orientation,
      color: this.color,
      isOpenMobile: this.isOpenMobile,
      margin: this.margin,
      thickness: this.thickness,
      radius: this.radius,
    });
  }
}
