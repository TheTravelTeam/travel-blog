import { Component, Input } from '@angular/core';
import { CardComponent } from '../../card/card.component';
import { CardBodyComponent } from '../../card/card-body/card-body.component';
import { IconComponent } from '../../icon/icon.component';
import { ChipComponent } from '../../Atoms/chip/chip.component';
import { VariantTripCard } from '../../../model/visual-trip-card';

@Component({
  selector: 'app-travel-diary-card',
  imports: [CardComponent, CardBodyComponent, IconComponent, ChipComponent],
  templateUrl: './travel-diary-card.component.html',
  styleUrl: './travel-diary-card.component.scss',
})
export class TravelDiaryCardComponent {
  @Input({ required: true }) id!: VariantTripCard['id'];
  @Input({ required: true }) title!: VariantTripCard['title'];
  @Input({ required: true }) image!: VariantTripCard['image'];
  @Input({ required: true }) description!: VariantTripCard['longDescription'];

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
