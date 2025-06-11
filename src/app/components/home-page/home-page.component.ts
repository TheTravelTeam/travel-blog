import { Component } from '@angular/core';
import { ButtonComponent } from '../Button/button/button.component';
import { CardComponent } from '../card/card.component';
import { CardBodyComponent } from '../card/card-body/card-body.component';
import { CardFooterComponent } from '../card/card-footer/card-footer.component';
import { CardHeaderComponent } from '../card/card-header/card-header.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    ButtonComponent,
    CardComponent,
    CardBodyComponent,
    CardFooterComponent,
    CardHeaderComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {}
