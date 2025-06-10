import { Component } from '@angular/core';
import { CheckboxComponent } from '../../components/checkbox/checkbox/checkbox.component';
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CheckboxComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {}
