import { Directive, HostListener, Input, OnInit } from '@angular/core';

@Directive({
  selector: 'img[appDefaultImage]',
})
export class ImageFallbackDirective implements OnInit {
  @Input() appDefaultImage!: string;

  ngOnInit(): void {
    if (!this.appDefaultImage) {
      this.appDefaultImage = 'image-3.svg';
    }
  }

  @HostListener('error', ['$event'])
  onError(event: Event): void {
    const element = event.target as HTMLImageElement;
    element.src = this.appDefaultImage;
  }
}
