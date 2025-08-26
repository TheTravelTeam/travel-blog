import { Component, inject, Input } from '@angular/core';
import { avatarDefaultProps, AvatarProps } from '@model/avatar.model';
import { CommonModule } from '@angular/common';
import { AvatarService } from './avatar.service';

@Component({
  selector: 'app-avatar',
  imports: [CommonModule],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss',
  providers: [AvatarService],
})
export class AvatarComponent {
  // # region Input
  @Input({ required: true }) label!: AvatarProps['label'];
  @Input() alt: AvatarProps['alt'] = avatarDefaultProps.alt;
  @Input() color: AvatarProps['color'] = avatarDefaultProps.color;
  @Input() isInactive: AvatarProps['isInactive'] = avatarDefaultProps.isInactive;
  @Input() picture: AvatarProps['picture'];
  @Input() size: AvatarProps['size'] = avatarDefaultProps.size;
  // # endregion Input

  avatarService = inject(AvatarService);

  get initials() {
    return this.avatarService.getInitials(this.label);
  }
}
