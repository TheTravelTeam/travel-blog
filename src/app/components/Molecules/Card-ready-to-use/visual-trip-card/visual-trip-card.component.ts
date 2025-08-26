import { Component, Input } from '@angular/core';
import { VariantTripCard } from '@model/visual-trip-card.model';
import { CardBodyComponent } from 'components/Atoms/Card/card-body/card-body.component';
import { CardFooterComponent } from 'components/Atoms/Card/card-footer/card-footer.component';
import { CardComponent } from 'components/Atoms/Card/card.component';
import { ChipComponent } from 'components/Atoms/chip/chip.component';

@Component({
  selector: 'app-visual-trip-card',
  imports: [CardComponent, CardBodyComponent, CardFooterComponent, ChipComponent],
  templateUrl: './visual-trip-card.component.html',
  styleUrl: './visual-trip-card.component.scss',
})
export class VisualTripCardComponent {
  @Input({ required: true }) id!: VariantTripCard['id'];
  @Input({ required: true }) title!: VariantTripCard['country'];
  @Input({ required: true }) image!: VariantTripCard['image'];
  @Input({ required: true }) description!: VariantTripCard['title'];
  @Input({ required: true }) author!: VariantTripCard['author'];
  @Input({ required: true }) dateCreation!: VariantTripCard['dateCreation'];

  onCardClick(): void {
    // if (this.route) {
    //   this.router.navigate([this.route]);
    // }
  }
}
