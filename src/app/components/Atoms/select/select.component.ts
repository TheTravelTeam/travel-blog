import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Component,
  computed,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  QueryList,
  signal,
  SimpleChanges,
  ViewChildren,
} from '@angular/core';
import { ItemProps, selectDefaultProps, SelectProps } from '@model/select.model';
import { SelectService } from './select.service';
import { IconComponent } from '../Icon/icon.component';
import { ClickOutsideDirective } from 'shared/directives/click-outside.directive';
import { verticalSlide } from 'animations/vertical-slide.animation';

interface Item {
  id: number;
  label: string;
}

@Component({
  selector: 'app-select',
  imports: [CommonModule, FormsModule, IconComponent, ClickOutsideDirective],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  providers: [SelectService],
  animations: [verticalSlide],
})
export class SelectComponent implements OnChanges {
  /*********region Inputs *********/
  @Input({ required: true }) itemsList!: SelectProps['itemsList'];
  @Input({ required: true }) label!: SelectProps['label'];
  @Input() disabled: SelectProps['disabled'] = selectDefaultProps['disabled'];
  @Input() maxSelectionMessage: NonNullable<SelectProps['maxSelectionMessage']> =
    selectDefaultProps['maxSelectionMessage'];
  @Input() placeholder: SelectProps['placeholder'] = selectDefaultProps['placeholder'];
  @Input() withMutipleSelect: SelectProps['withMultipleSelect'] =
    selectDefaultProps['withMultipleSelect'];
  @Input() selectedId: number | null = null;
  /*********endregion Inputs *********/

  // *********region Ouput *********
  @Output() selectOnChange = new EventEmitter<ItemProps | ItemProps[]>();
  /*********endregion Onput *********/

  /*********region ViewChildren *********/
  @ViewChildren('dropdownItems') dropdownItems!: QueryList<ElementRef<HTMLElement>>;
  /*********endregion ViewChildren *********/

  /*********region inject *********/
  selectService = inject(SelectService);
  private elRef = inject(ElementRef);
  /*********endregion inject *********/

  /*********region signals ***********/
  readonly isOpen = signal(false);
  readonly errorMessage = signal('');
  readonly itemsSelected = signal<ItemProps[]>([]);
  readonly oneItemSelected = signal<ItemProps | undefined>(undefined);
  readonly activeIndex = signal(-1);
  /*********endregion signals ***********/

  /********region computed *********/
  readonly activeOptionId = computed(() => {
    const index = this.activeIndex();
    return index >= 0 ? `option-${index}-${this.id}` : '';
  });
  /********endregion computed *********/

  /********region internal property *********/
  readonly id = crypto.randomUUID();
  /********endregion internal property *********/

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedId'] || changes['itemsList']) {
      this.syncSelectionFromInputs();
    }
  }

  /********region getters *********/
  get inputValue() {
    if (this.withMutipleSelect) {
      return '';
    }
    return this.oneItemSelected() ? this.oneItemSelected()?.label : '';
  }
  /********endregion getters *********/

  private syncSelectionFromInputs(): void {
    if (this.withMutipleSelect) {
      return;
    }

    if (!Array.isArray(this.itemsList) || !this.itemsList.length) {
      this.oneItemSelected.set(undefined);
      return;
    }

    if (this.selectedId == null) {
      this.oneItemSelected.set(undefined);
      return;
    }

    const matchingItem = this.itemsList.find((item) => item.id === this.selectedId);
    this.oneItemSelected.set(matchingItem);
  }

  /*********region dropdown controls ***********/
  private focusItem(index: number) {
    setTimeout(() => {
      this.activeIndex.set(index);
      const items = this.dropdownItems.toArray();
      items[index].nativeElement.focus();
      items[index].nativeElement.scrollIntoView({ block: 'center' });
    }, 0);
  }

  private setDropdownVisibility(visible: boolean) {
    if (!this.disabled) {
      this.isOpen.set(visible);
      if (!visible) this.activeIndex.set(-1);
    }
  }

  private focusTriggerButton() {
    setTimeout(() => {
      const btn = this.elRef.nativeElement.querySelector(
        '.select__container--button'
      ) as HTMLElement | null;
      btn?.focus();
    }, 0);
  }

  public toggleDropdown() {
    if (!this.disabled) this.isOpen.update((open) => !open);
    this.errorMessage.set('');
  }

  public closeDropDown(): void {
    this.setDropdownVisibility(false);
  }

  public openAndFocusFirst(): void {
    this.setDropdownVisibility(true);
    const items = this.dropdownItems.toArray();
    if (items.length > 0) {
      this.focusItem(0);
    }
  }
  /*********endregion dropdown controls **********/

  /*******region select item/items *********/
  public toggleItem(item: Item) {
    if (this.disabled) return;

    this.errorMessage.set('');

    if (this.withMutipleSelect) {
      const selected = this.itemsSelected();
      if (this.selectService.isSelected(item, selected)) {
        this.itemsSelected.set(this.selectService.toggleItem(item, selected));
      } else {
        if (!this.selectService.canAddMore(selected)) {
          this.errorMessage.set(this.maxSelectionMessage);
          this.closeDropDown();
          return;
        }
        this.itemsSelected.set(this.selectService.toggleItem(item, selected));
      }
      this.selectOnChange.emit(this.oneItemSelected());
    } else {
      this.oneItemSelected.set(item);
      this.selectedId = item.id;
      this.selectOnChange.emit(item);
      this.closeDropDown();
    }
  }

  public isSelected(item: ItemProps): boolean {
    return this.withMutipleSelect
      ? this.selectService.isSelected(item, this.itemsSelected())
      : this.oneItemSelected()?.id === item.id;
  }
  /********endregion select item/items *********/

  /*******region remove chip *********/
  public removeChip(id: number, e: Event): void {
    e.stopPropagation();
    if (this.disabled) return;
    this.itemsSelected.set(this.itemsSelected().filter((item) => item.id !== id));
    this.errorMessage.set('');
    this.selectOnChange.emit(this.itemsSelected());
  }
  /*******endregion remove chip *********/

  /*******region keyboard navigation ********/
  public navigateWithKey(event: KeyboardEvent): void {
    const items = this.dropdownItems.toArray();
    const currentIndex = this.activeIndex();
    let nextIndex = -1;
    let shouldPrevent = true;

    switch (event.key) {
      case 'ArrowDown':
        if (this.isOpen()) {
          nextIndex = (currentIndex + 1) % items.length;
        } else {
          this.openAndFocusFirst();
        }
        break;
      case 'ArrowUp':
        if (this.isOpen()) {
          nextIndex = (currentIndex - 1 + items.length) % items.length;
        } else {
          this.openAndFocusFirst();
        }
        break;
      case 'Home':
        if (!this.isOpen()) this.setDropdownVisibility(true);
        nextIndex = 0;
        break;
      case 'End':
        if (!this.isOpen()) this.setDropdownVisibility(true);
        nextIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        if (!this.isOpen()) {
          this.openAndFocusFirst();
        } else {
          if (currentIndex >= 0 && currentIndex < items.length) {
            items[currentIndex]?.nativeElement.click();
            this.closeDropDown();
            this.focusTriggerButton();
          }
        }
        break;
      case 'Escape':
        this.closeDropDown();
        this.focusTriggerButton();
        break;

      case 'Tab':
        shouldPrevent = false;
        if (this.isOpen()) {
          this.closeDropDown();
          this.focusTriggerButton();
        }
        break;

      default:
        return;
    }
    if (nextIndex >= 0 && nextIndex < items.length) this.focusItem(nextIndex);
    if (shouldPrevent) event.preventDefault();
  }
  /*******endregion keyboard navigation ********/

  /******** region focus out *********/
  public onFocusOut(event: FocusEvent) {
    if (!this.elRef.nativeElement.contains(event.relatedTarget)) {
      this.closeDropDown();
    }
  }
  /******** endregion focus out *********/
}
