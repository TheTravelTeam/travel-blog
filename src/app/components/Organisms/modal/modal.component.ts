import {
  Component,
  ElementRef,
  ViewChild,
  Input,
  signal,
  Output,
  EventEmitter,
} from '@angular/core';
import { modalDefaultProps, ModalProps } from '@model/modal.model';
import { modalAnimation } from 'animations/modal.animation';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';

@Component({
  selector: 'app-modal',
  imports: [ButtonComponent, IconComponent],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
  animations: [modalAnimation],
})
export class ModalComponent {
  @ViewChild('modalWrapper') modalWrapper!: ElementRef<HTMLDialogElement>;

  @Input({ required: true }) rightButtonLabel!: ModalProps['rightButtonLabel'];
  @Input({ required: true }) description!: ModalProps['description'];
  @Input({ required: true }) title!: ModalProps['title'];
  @Input() leftButtonLabel: NonNullable<ModalProps['leftButtonLabel']> =
    modalDefaultProps['leftButtonLabel'];
  @Input() isDangerModal: ModalProps['isDangerModal'] = modalDefaultProps['isDangerModal'];

  @Output() confirm = new EventEmitter<void>();

  private readonly MAX_TITLE_LENGTH = 65;

  readonly isOpen = signal(false);

  get truncatedTitle() {
    if (!this.title) return;
    return this.title.length > this.MAX_TITLE_LENGTH
      ? this.title.slice(0, this.MAX_TITLE_LENGTH) + '...'
      : this.title;
  }

  public open() {
    this.modalWrapper.nativeElement.showModal();
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    setTimeout(() => this.modalWrapper.nativeElement.close(), 200);
  }

  confirmAction() {
    this.confirm.emit();
  }
}
