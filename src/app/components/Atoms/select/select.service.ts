import { Injectable } from '@angular/core';
import { ItemProps } from '../../../model/select.model';

@Injectable({
  providedIn: 'root',
})
export class SelectService {
  readonly MAX_SELECTION = 3;

  filterItems(items: ItemProps[], word: string): ItemProps[] {
    return items.filter((i) => i.label.toLowerCase().includes(word.toLowerCase().trim()));
  }

  isSelected(item: ItemProps, selectedItems: ItemProps[]): boolean {
    return selectedItems.some((i) => i.id === item.id);
  }

  toggleItem(item: ItemProps, selectedItems: ItemProps[]): ItemProps[] {
    const alreadySelected = this.isSelected(item, selectedItems);
    return alreadySelected
      ? selectedItems.filter((i) => i.id !== item.id)
      : [...selectedItems, item];
  }

  canAddMore(selectedItems: ItemProps[]): boolean {
    return selectedItems.length < this.MAX_SELECTION;
  }
}
