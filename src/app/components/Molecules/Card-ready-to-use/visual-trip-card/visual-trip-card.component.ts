import { Component, Input, inject } from '@angular/core';
import { VariantTripCard } from '@model/visual-trip-card.model';
import { CardBodyComponent } from 'components/Atoms/Card/card-body/card-body.component';
import { CardFooterComponent } from 'components/Atoms/Card/card-footer/card-footer.component';
import { CardComponent } from 'components/Atoms/Card/card.component';
import { ChipComponent } from 'components/Atoms/chip/chip.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-visual-trip-card',
  imports: [CardComponent, CardBodyComponent, CardFooterComponent, ChipComponent],
  templateUrl: './visual-trip-card.component.html',
  styleUrl: './visual-trip-card.component.scss',
})
export class VisualTripCardComponent {
  @Input({ required: true }) id!: VariantTripCard['id'];
  @Input() title!: VariantTripCard['country'];
  @Input({ required: true }) image!: VariantTripCard['image'];
  @Input({ required: true }) description!: VariantTripCard['title'];
  @Input({ required: true }) author!: VariantTripCard['author'];
  @Input({ required: true }) dateCreation!: VariantTripCard['dateCreation'];
  @Input() routeCommands?: string | unknown[];
  @Input() queryParams?: Record<string, unknown>;

  private readonly router = inject(Router);

  onCardClick(): void {
    if (!this.routeCommands) {
      return;
    }

    const commands = Array.isArray(this.routeCommands)
      ? (this.routeCommands as unknown[])
      : [this.routeCommands];

    void this.router.navigate(commands as any[], this.queryParams ? { queryParams: this.queryParams } : undefined);
  }
}
