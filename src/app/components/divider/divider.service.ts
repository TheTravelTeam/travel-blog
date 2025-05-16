import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DividerService {
  getClasses(params: {
    orientation?: string;
    color?: string;
    isOpenMobile?: boolean;
    margin?: string;
    thickness?: string;
    radius?: string;
  }): string[] {
    return [
      'divider',
      `divider--${params.orientation}`,
      `divider--${params.color}`,
      `divider--${params.thickness}`,
      `divider--margin-${params.margin}`,
      params.radius ? `divider--radius-${params.radius}` : '',
      params.isOpenMobile ? `divider--mobile` : '',
    ];
  }
}
