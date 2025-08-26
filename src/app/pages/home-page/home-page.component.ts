import { FooterComponent } from './../../components/footer/footer.component';
import { Component } from '@angular/core';
import { TopBarComponent } from '../../components/top-bar/top-bar.component';
import { VisualTripCardComponent } from '../../components/card-ready-to-use/visual-trip-card/visual-trip-card.component';
import { CardComponent } from '../../components/card/card.component';
import { ButtonComponent } from '../../components/Button/button/button.component';
import { ChipComponent } from '../../components/Atoms/chip/chip.component';
import { IconComponent } from '../../components/icon/icon.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    FooterComponent,
    TopBarComponent,
    VisualTripCardComponent,
    CardComponent,
    ButtonComponent,
    ChipComponent,
    IconComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {}
