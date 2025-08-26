import { Directive, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: '[clickOutside]',
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();

  constructor(private elementRef: ElementRef) {}

  @HostListener('document:click', ['$event.target'])
  public onClick(target: EventTarget | null) {
    const clickedInside: boolean =
      target instanceof Node && (this.elementRef.nativeElement as Element).contains(target);
    if (!clickedInside) {
      this.clickOutside.emit();
    }
  }
}
