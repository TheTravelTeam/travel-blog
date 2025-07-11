import { Component } from '@angular/core';
import { VisualTripCardComponent } from '../../components/card-ready-to-use/visual-trip-card/visual-trip-card.component';
import { CardComponent } from '../../components/card/card.component';
import { ButtonComponent } from '../../components/Button/button/button.component';
import { ChipComponent } from '../../components/Atoms/chip/chip.component';
import { FooterComponent } from '../../components/footer/footer.component';
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    VisualTripCardComponent,
    CardComponent,
    ButtonComponent,
    ChipComponent,
    FooterComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {}
