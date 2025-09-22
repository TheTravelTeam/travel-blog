import { DividerService } from './divider.service';
import { Component, HostBinding, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Divider, dividerDefault } from '@model/divider.model';

@Component({
  selector: 'app-divider',
  imports: [CommonModule],
  templateUrl: './divider.component.html',
  styleUrl: './divider.component.scss',
})
export class DividerComponent {
  dividerService = inject(DividerService);
  @HostBinding('class.divider-host') readonly dividerHostClass = true;
  @HostBinding('class.divider-host--horizontal') get isHorizontalHost(): boolean {
    return this.orientation === 'horizontal';
  }
  @HostBinding('class.divider-host--vertical') get isVerticalHost(): boolean {
    return this.orientation === 'vertical';
  }
  @Input()
  orientation: Divider['orientation'] = dividerDefault['orientation'];
  @Input() color: Divider['color'] = dividerDefault['color'];
  @Input() thickness: Divider['thickness'] = dividerDefault['thickness'];
  @Input() margin: Divider['margin'] = dividerDefault['margin'];
  @Input() isOpenMobile: Divider['isOpenMobile'] = dividerDefault['isOpenMobile'];
  @Input() radius: Divider['radius'] = dividerDefault['radius'];
  @Input() size: Divider['size'] = dividerDefault['size'];

  get classes(): string[] {
    return this.dividerService.getClasses({
      orientation: this.orientation,
      color: this.color,
      isOpenMobile: this.isOpenMobile,
      margin: this.margin,
      thickness: this.thickness,
      radius: this.radius,
      size: this.size,
    });
  }
}
