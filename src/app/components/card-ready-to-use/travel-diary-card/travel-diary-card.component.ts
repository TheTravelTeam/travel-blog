<<<<<<< HEAD
import { Component, Input } from '@angular/core';
import { CardComponent } from '../../card/card.component';
import { CardBodyComponent } from '../../card/card-body/card-body.component';
import { IconComponent } from '../../icon/icon.component';
import { VariantTripCard } from '../../../model/visual-trip-card';

@Component({
  selector: 'app-travel-diary-card',
  imports: [CardComponent, CardBodyComponent, IconComponent],
=======
import { BreakpointService } from './../../../services/breakpoint.service';
import { VariantTripCard } from './../../../model/visual-trip-card';
import { Component, inject, Input } from '@angular/core';
import { CardComponent } from '../../card/card.component';
import { CardBodyComponent } from '../../card/card-body/card-body.component';
import { IconComponent } from '../../icon/icon.component';
import { CardHeaderComponent } from '../../card/card-header/card-header.component';

@Component({
  selector: 'app-travel-diary-card',
  imports: [CardComponent, CardBodyComponent, IconComponent, CardHeaderComponent],
>>>>>>> 4d80827 (KAN-214 commit before merge)
  templateUrl: './travel-diary-card.component.html',
  styleUrl: './travel-diary-card.component.scss',
})
export class TravelDiaryCardComponent {
  @Input({ required: true }) id!: VariantTripCard['id'];
  @Input({ required: true }) title!: VariantTripCard['title'];
  @Input({ required: true }) image!: VariantTripCard['image'];
  @Input({ required: true }) description!: VariantTripCard['description'];

<<<<<<< HEAD
=======
  private breakpointService = inject(BreakpointService);
  isMobileOrTable = this.breakpointService.isMobileOrTablet;

>>>>>>> 4d80827 (KAN-214 commit before merge)
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
