import { Component } from '@angular/core';
import { CardComponent } from '../../components/card/card.component';
import { CardBodyComponent } from '../../components/card/card-body/card-body.component';
import { IconComponent } from '../../components/icon/icon.component';
import { ButtonComponent } from '../../components/Button/button/button.component';

@Component({
  selector: 'app-travel-diary-card',
  imports: [CardComponent, CardBodyComponent, IconComponent, ButtonComponent],
  templateUrl: './travel-diary-card.component.html',
  styleUrl: './travel-diary-card.component.scss',
})
export class TravelDiaryCardComponent {
  onEdit(): void {
    //
  }

  onDelete(): void {
    //
  }

  onCardClick(): void {
    // if (this.route) {
    //   this.router.navigate([this.route]);
    // }
  }
}
