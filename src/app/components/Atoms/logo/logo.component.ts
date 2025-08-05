import { Component, Input } from '@angular/core';
import { Logo, logoDefault } from '@model/logo.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  imports: [CommonModule],
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.scss',
})
export class LogoComponent {
  @Input({ required: true }) src: Logo['src'] = logoDefault['src'];
  @Input() alt?: Logo['alt'] = logoDefault['alt'];
  @Input() size: Logo['size'] = logoDefault['size'];
  @Input() ariaLabel: Logo['ariaLabel'] = logoDefault['ariaLabel'];
}
