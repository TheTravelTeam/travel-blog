import { FooterComponent } from './../../components/footer/footer.component';
import { Component } from '@angular/core';
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [FooterComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {}
