import { Component, Input } from '@angular/core';
import { BreadcrumbItem, iconColorDefault } from '../../../model/breadcrumb';
import { IconComponent } from '../../icon/icon.component';
import { CommonModule } from '@angular/common';
import { IconColor } from '../../../model/variant';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [IconComponent, CommonModule],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
})
export class BreadcrumbComponent {
  @Input({ required: true }) breadcrumbItems!: BreadcrumbItem[];
  @Input() color: IconColor = iconColorDefault;
}
