import { Component, Input } from '@angular/core';
import { BreadcrumbItem, iconColorDefault } from '@model/breadcrumb.model';
import { CommonModule } from '@angular/common';
import { IconColor } from '@model/variant.model';
import { IconComponent } from '../Icon/icon.component';

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
