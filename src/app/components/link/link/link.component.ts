import { Component, Input } from '@angular/core';
import { Link, linkDefault } from '../../../model/link';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-link',
  imports: [CommonModule, RouterModule],
  templateUrl: './link.component.html',
  styleUrl: './link.component.scss',
})
export class LinkComponent {
  @Input({ required: true }) label!: Link['label'];
  @Input({ required: true }) route!: Link['route'];
  @Input() color: Link['color'] = linkDefault['color'];
  @Input() icon: Link['icon'] = linkDefault['icon'];
}
