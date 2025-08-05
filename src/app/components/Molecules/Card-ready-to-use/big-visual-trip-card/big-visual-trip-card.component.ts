import { Component, Input } from '@angular/core';
import { CardBodyComponent } from '../../card/card-body/card-body.component';
import { CardFooterComponent } from '../../card/card-footer/card-footer.component';
import { CardHeaderComponent } from '../../card/card-header/card-header.component';
import { CardComponent } from '../../card/card.component';
import { VariantTripCard } from '../../../model/visual-trip-card';
import { ChipComponent } from '../../Atoms/chip/chip.component';

@Component({
  selector: 'app-big-visual-trip-card',
  imports: [
    CardComponent,
    CardBodyComponent,
    CardFooterComponent,
    CardHeaderComponent,
    ChipComponent,
  ],
  templateUrl: './big-visual-trip-card.component.html',
  styleUrl: './big-visual-trip-card.component.scss',
})
export class BigVisualTripCardComponent {
  @Input({ required: true }) id!: VariantTripCard['id'];
  @Input({ required: true }) title!: VariantTripCard['title'];
  @Input({ required: true }) image!: VariantTripCard['image'];
  @Input({ required: true }) description!: VariantTripCard['description'];
  @Input({ required: true }) author!: VariantTripCard['author'];
  @Input({ required: true }) dateCreation!: VariantTripCard['dateCreation'];
  @Input({ required: true }) country!: VariantTripCard['country'];
  @Input({ required: true }) continent!: VariantTripCard['continent'];
}
