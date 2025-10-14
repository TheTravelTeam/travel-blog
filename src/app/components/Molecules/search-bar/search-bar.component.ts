import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

/**
 * Barre de recherche réutilisable qui encapsule un `FormControl` et expose des
 * évènements de cycle de vie (submit, focus, blur, clear).
 *
 * Elle est pensée pour partager un rendu commun (icône, champ, bouton clear) lors
 * de recherches globales ou contextuelles dans l'application.
 */
@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
})
export class SearchBarComponent {
  @Input({ required: true }) control!: FormControl<string>;
  @Input() placeholder = 'Rechercher';
  @Input() autocomplete = 'off';
  @Input() dataTestId: string | null = null;
  @Input() size: 'default' | 'compact' = 'default';

  @Output() searchSubmit = new EventEmitter<string>();
  @Output() searchFocus = new EventEmitter<FocusEvent>();
  @Output() searchBlur = new EventEmitter<FocusEvent>();
  @Output() clear = new EventEmitter<void>();

  get hasValue(): boolean {
    return this.trimmedValue.length > 0;
  }

  private get trimmedValue(): string {
    const value = this.control?.value ?? '';
    return value.trim();
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    this.searchSubmit.emit(this.trimmedValue);
  }

  onFocus(event: FocusEvent): void {
    this.searchFocus.emit(event);
  }

  onBlur(event: FocusEvent): void {
    this.searchBlur.emit(event);
  }

  onClearMouseDown(event: MouseEvent): void {
    event.preventDefault();
  }

  onClearClick(): void {
    this.clear.emit();
  }
}
