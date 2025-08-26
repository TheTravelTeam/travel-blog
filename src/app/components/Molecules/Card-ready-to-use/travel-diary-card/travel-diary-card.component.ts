import { Component, Input } from '@angular/core';
import { VariantTripCard } from '@model/visual-trip-card.model';
import { CardBodyComponent } from 'components/Atoms/Card/card-body/card-body.component';
import { CardComponent } from 'components/Atoms/Card/card.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { BreakpointService } from '@service/breakpoint.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-travel-diary-card',
  imports: [CardComponent, CardBodyComponent, IconComponent, CommonModule],
  templateUrl: './travel-diary-card.component.html',
  styleUrl: './travel-diary-card.component.scss',
})
export class TravelDiaryCardComponent {
  @Input({ required: true }) id!: VariantTripCard['id'];
  @Input({ required: true }) title!: VariantTripCard['title'];
  @Input({ required: true }) image!: VariantTripCard['image'];
  @Input({ required: true }) description!: VariantTripCard['description'];
  @Input() isAltBackground = false;

  private breakpointService = inject(BreakpointService);
  isTablet = this.breakpointService.isTablet;
  isMobile = this.breakpointService.isMobile;
  isMobileOrTablet = this.breakpointService.isMobileOrTablet;

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
