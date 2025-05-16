import { Component, Input } from '@angular/core';
import { Link, linkDefault } from '../../../model/link';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-link',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './link.component.html',
  styleUrl: './link.component.scss',
})
export class LinkComponent {
  @Input() label!: Link['label'];
  @Input() route!: Link['route'];
  @Input() color: Link['color'] = linkDefault['color'];
  @Input() icon: Link['icon'] = linkDefault['icon'];
}
