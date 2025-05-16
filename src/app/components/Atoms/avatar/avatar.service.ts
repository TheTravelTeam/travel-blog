import { Injectable } from '@angular/core';

@Injectable()
export class AvatarService {
  getInitials(label: string) {
    if (label) {
      const cleanInput = label.trim();
      if (cleanInput.includes(' ')) {
        return this.initialsFromUser(cleanInput);
      }
      return this.initialFromUsername(cleanInput);
    }
    return '';
  }
  private initialsFromUser(label: string) {
    return label
      .split(' ')
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  private initialFromUsername(label: string) {
    return label.substring(0, 2).toUpperCase();
  }
}
