import { Component, Input } from '@angular/core';
import { VariantTripCard } from '@model/visual-trip-card.model';
import { CardBodyComponent } from 'components/Atoms/Card/card-body/card-body.component';
import { CardFooterComponent } from 'components/Atoms/Card/card-footer/card-footer.component';
import { CardHeaderComponent } from 'components/Atoms/Card/card-header/card-header.component';
import { CardComponent } from 'components/Atoms/Card/card.component';
import { ChipComponent } from 'components/Atoms/chip/chip.component';

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
