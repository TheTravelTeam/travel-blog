import { Component, ContentChild, EventEmitter, Input, Output } from '@angular/core';
import { Card, cardDefault } from '../../model/card';
import { CommonModule } from '@angular/common';
import { CardBodyComponent } from './card-body/card-body.component';
import { CardFooterComponent } from './card-footer/card-footer.component';
import { CardHeaderComponent } from './card-header/card-header.component';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  @Input({ required: true }) width!: Card['width'];
  @Input({ required: true }) height!: Card['height'];
  @Input() layout: Card['layout'] = cardDefault['layout'];
  @Input() radius: Card['radius'] = cardDefault['radius'];
  @Input() isDisabled: Card['isDisabled'];
  @Input() isHoverable: Card['isHoverable'];
  @Input() isClickable: Card['isClickable'];
  @Input() justifyContent: Card['justifyContent'] = cardDefault['justifyContent'];
  @Input() borderColor: Card['borderColor'] = cardDefault['borderColor'];
  @Input() borderWeight: Card['borderWeight'] = cardDefault['borderWeight'];
  @Input() backgroundColor: Card['backgroundColor'];
  @Input() shadow: Card['shadow'];
  @Input() margin: Card['margin'];
  @Input() padding: Card['padding'];

  @Output() cardClick = new EventEmitter<void>();

  @ContentChild(CardHeaderComponent) header?: CardHeaderComponent;
  @ContentChild(CardBodyComponent) body?: CardBodyComponent;
  @ContentChild(CardFooterComponent) footer?: CardFooterComponent;

  handleClick(): void {
    if (!this.isDisabled) {
      this.cardClick.emit();
    }
  }
}
