import { Component } from '@angular/core';
import { ToggleBtnComponent } from '../../components/toggle-btn/toggle-btn.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [ToggleBtnComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {}
