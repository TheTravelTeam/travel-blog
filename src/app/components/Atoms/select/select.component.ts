import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { IconComponent } from '../../icon/icon.component';
import { ItemProps, selectDefaultProps, SelectProps } from '../../../model/select.model';
import { SelectService } from './select.service';

interface Item {
  id: number;
  label: string;
}

@Component({
  selector: 'app-select',
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  providers: [SelectService],
})
export class SelectComponent implements OnInit {
  @Input({ required: true }) items!: SelectProps['items'];
  @Input({ required: true }) label!: SelectProps['label'];
  @Input() disabled: SelectProps['disabled'] = selectDefaultProps['disabled'];
  @Input() maxSelectionMessage: NonNullable<SelectProps['maxSelectionMessage']> =
    selectDefaultProps['maxSelectionMessage'];
  @Input() placeholder: SelectProps['placeholder'] = selectDefaultProps['placeholder'];
  @Input() withMutipleSelect: SelectProps['withMultipleSelect'] =
    selectDefaultProps['withMultipleSelect'];

  @Output() selectOnChange = new EventEmitter<ItemProps | ItemProps[]>();

  selectService = inject(SelectService);

  modelValue = '';
  isOpen = false;
  readonly MAX_SELECTION = 3;
  errorMessage = '';

  itemsSelected: ItemProps[] = [];
  itemSelected: ItemProps | null = null;
  itemsList: ItemProps[] = [];

  ngOnInit() {
    this.itemsList = [...this.items];
  }

  get filteredItems(): ItemProps[] {
    return this.selectService.filterItems(this.items, this.modelValue);
  }

  toggleDropdown() {
    if (!this.disabled) this.isOpen = !this.isOpen;
    this.errorMessage = '';
  }

  toggleItem(item: Item) {
    if (this.disabled) return;

    this.errorMessage = '';

    if (this.withMutipleSelect) {
      if (this.selectService.isSelected(item, this.itemsSelected)) {
        this.itemsSelected = this.selectService.toggleItem(item, this.itemsSelected);
      } else {
        if (!this.selectService.canAddMore(this.itemsSelected)) {
          this.errorMessage = this.maxSelectionMessage;
          this.isOpen = false;
          return;
        }
        this.itemsSelected = this.selectService.toggleItem(item, this.itemsSelected);
      }
      this.selectOnChange.emit(this.itemsSelected);
    } else {
      this.itemSelected = item;
      this.selectOnChange.emit(this.itemSelected);
      this.isOpen = false;
    }
  }

  isSelected(item: Item): boolean {
    return this.withMutipleSelect
      ? this.selectService.isSelected(item, this.itemsSelected)
      : this.itemSelected?.id === item.id;
  }

  removeChip(id: number, e: Event) {
    e.stopPropagation();
    if (this.disabled) return;
    this.itemsSelected = this.itemsSelected.filter((item) => item.id !== id);
    this.errorMessage = '';
    this.selectOnChange.emit(this.itemsSelected);
  }
}
