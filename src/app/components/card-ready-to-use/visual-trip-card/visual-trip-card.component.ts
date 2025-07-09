import { Component, Input } from '@angular/core';
import { CardComponent } from '../../card/card.component';
import { CardBodyComponent } from '../../card/card-body/card-body.component';
import { CardFooterComponent } from '../../card/card-footer/card-footer.component';
import { ChipComponent } from '../../Atoms/chip/chip.component';
import { VariantTripCard } from '../../../model/visual-trip-card';

@Component({
  selector: 'app-visual-trip-card',
  imports: [CardComponent, CardBodyComponent, CardFooterComponent, ChipComponent],
  templateUrl: './visual-trip-card.component.html',
  styleUrl: './visual-trip-card.component.scss',
})
export class VisualTripCardComponent {
  @Input({ required: true }) id!: VariantTripCard['id'];
  @Input({ required: true }) title!: VariantTripCard['title'];
  @Input({ required: true }) image!: VariantTripCard['image'];
  @Input({ required: true }) description!: VariantTripCard['shortdescription'];
  @Input({ required: true }) author!: VariantTripCard['author'];
  @Input({ required: true }) dateCreation!: VariantTripCard['dateCreation'];

  onCardClick(): void {
    // if (this.route) {
    //   this.router.navigate([this.route]);
    // }
  }
}
