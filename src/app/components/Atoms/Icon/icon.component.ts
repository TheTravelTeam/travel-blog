import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Icon, iconDefault } from '@model/icon.model';
import { IconSize } from '@model/variant.model';

@Component({
  selector: 'app-icon',
  imports: [CommonModule],
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
})
export class IconComponent {
  @Input({ required: true }) name!: Icon['name'];
  @Input() size: Icon['size'] = iconDefault['size'];
  @Input() color: Icon['color'] = iconDefault['color'];
  @Input() weight: Icon['weight'] = iconDefault['weight'];
  @Input() fill: Icon['fill'] = iconDefault['fill'];
  @Input() grade: Icon['grade'] = iconDefault['grade'];
  @Input() customClass: Icon['customClass'] = iconDefault['customClass'];

  getFontVariationSettings(): string {
    return `
      'opsz' ${this.getOpticalSize()},
      'wght' ${this.weight},
      'FILL' ${this.fill ? 1 : 0},
      'GRAD' ${this.grade}
    `;
  }

  private getOpticalSize(): number | undefined {
    if (!this.size) return;
    const sizeMap: Record<IconSize, number> = {
      xs: 20,
      sm: 24,
      md: 32,
      lg: 40,
      xl: 48,
      xxl: 52,
    } as const;
    return sizeMap[this.size];
  }
}
