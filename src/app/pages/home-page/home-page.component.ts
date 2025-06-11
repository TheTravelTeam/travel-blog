import { Component } from '@angular/core';
import { ButtonComponent } from '../../components/Button/button/button.component';
import { IconComponent } from '../../components/icon/icon.component';
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {}
