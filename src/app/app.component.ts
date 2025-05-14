import { Component } from '@angular/core';
import { ChipComponent } from './components/chip/chip.component';
import { ChipProps } from '../core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ChipComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  chips: ChipProps[] = [
    { id: 'chip1', text: 'Suspendu', color: 'red' },
    { id: 'chip2', text: 'Terminé', color: 'green' },
    { id: 'chip3', text: 'En cours', color: 'yellow' },
  ];

  removeChip(idToRemove: string) {
    this.chips = this.chips.filter((chip) => chip.id !== idToRemove);
  }
}
