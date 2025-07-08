import { Component, Input } from '@angular/core';
import { CardComponent } from '../../components/card/card.component';
import { CardBodyComponent } from '../../components/card/card-body/card-body.component';
import { CardFooterComponent } from '../../components/card/card-footer/card-footer.component';
import { ChipComponent } from '../../components/Atoms/chip/chip.component';
import { VisualTripCard } from '../../model/visual-trip-card';

@Component({
  selector: 'app-visual-trip-card',
  imports: [CardComponent, CardBodyComponent, CardFooterComponent, ChipComponent],
  templateUrl: './visual-trip-card.component.html',
  styleUrl: './visual-trip-card.component.scss',
})
export class VisualTripCardComponent {
  @Input({ required: true }) id!: VisualTripCard['id'];
  @Input({ required: true }) title!: VisualTripCard['title'];
  @Input({ required: true }) image!: VisualTripCard['image'];
  @Input({ required: true }) description!: VisualTripCard['description'];
  @Input({ required: true }) author!: VisualTripCard['author'];
  @Input({ required: true }) dateCreation!: VisualTripCard['dateCreation'];

  onCardClick(): void {
    // if (this.route) {
    //   this.router.navigate([this.route]);
    // }
    alert(`Redirection vers le carnet avec ${this.id}`);
  }
}
