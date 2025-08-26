import { VisualTripCardComponent } from 'components/Molecules/Card-ready-to-use/visual-trip-card/visual-trip-card.component';
import { FooterComponent } from './../../components/footer/footer.component';
import { Component } from '@angular/core';
import { CardComponent } from 'components/Atoms/Card/card.component';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { ChipComponent } from 'components/Atoms/chip/chip.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    FooterComponent,
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
