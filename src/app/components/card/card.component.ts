import { Component, ContentChild, EventEmitter, Input, Output } from '@angular/core';
import { Card } from '../../model/card';
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
  @Input() layout: Card['layout'] = 'column';
  @Input() color: Card['color'] = 'primary';
  @Input() radius: Card['radius'] = 'sm';
  @Input() isDisabled: Card['isDisabled'];
  @Input() isHoverable: Card['isHoverable'];
  @Input() isClickable: Card['isClickable'];
  @Input() justifyContent: Card['justifyContent'] = 'around';
  @Input() alignItems: Card['alignItems'] = 'center';

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
