import { AfterViewInit, Component, inject, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { EditorComponent } from 'shared/editor/editor.component';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { SelectComponent } from 'components/Atoms/select/select.component';
import { ModalComponent } from 'components/Organisms/modal/modal.component';

@Component({
  selector: 'app-test-page',
  imports: [EditorComponent, ButtonComponent, SelectComponent, ModalComponent],
  templateUrl: './test-page.component.html',
  styleUrl: './test-page.component.scss',
})
export class TestPageComponent implements AfterViewInit {
  @ViewChild(EditorComponent) editor!: EditorComponent;
  @ViewChild('modal') modal!: ModalComponent;
  @ViewChild('modalDanger') modalDanger!: ModalComponent;

  sanitizer = inject(DomSanitizer);

  content = '';
  pendingContent = '';
  cleanedContent: SafeHtml = '';

  ngAfterViewInit() {
    // Ici, editor est disponible
    this.cleanedContent = this.editor.getCleanContent();
  }

  saveContent(editor: EditorComponent) {
    const cleaned = editor.getCleanContent();
    this.pendingContent = cleaned;
    console.info('Cleaned content ready to save:', cleaned);
    this.modal.open();
  }

  saveContentDanger(editor: EditorComponent) {
    const cleaned = editor.getCleanContent();
    this.pendingContent = cleaned;
    this.modalDanger.open();
  }

  confirmSaveContent() {
    //Safe HTML
    this.cleanedContent = this.sanitizer.bypassSecurityTrustHtml(this.pendingContent);
    this.content = '';
    if (this.modal?.isOpen()) {
      this.modal.close();
    } else if (this.modalDanger?.isOpen()) {
      this.modalDanger.close();
    }
  }
}
