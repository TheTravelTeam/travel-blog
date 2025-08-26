import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import Quill, { QuillOptions } from 'quill';

import { QuillEditorComponent, QuillModules } from 'ngx-quill';
import { FormsModule } from '@angular/forms';
import { editorDefaultProps, EditorProps } from '@model/editor.model';

@Component({
  selector: 'app-editor',
  imports: [QuillEditorComponent, FormsModule],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class EditorComponent implements AfterViewInit {
  @ViewChild(QuillEditorComponent) editor!: QuillEditorComponent;

  @Input({ required: true }) content!: EditorProps['content'];
  @Input() customConfig: EditorProps['customConfig'];
  @Input() placeholder: NonNullable<EditorProps['placeholder']> = editorDefaultProps['placeholder'];
  @Input() theme: NonNullable<EditorProps['theme']> = editorDefaultProps['theme'];
  @Input() readOnly: NonNullable<EditorProps['readonly']> = editorDefaultProps['readonly'];
  @Input() maxLength: NonNullable<EditorProps['maxLength']> = editorDefaultProps['maxLength'];

  @Output() contentChange = new EventEmitter<string>();

  errorMessage = signal('');
  charCount = signal(0);

  ngAfterViewInit(): void {
    const quill = this.editor.quillEditor;
    if (!quill) return;

    quill.on('text-change', () => {
      const text = quill.getText().trim();
      this.charCount.set(text.length);

      if (text.length > this.maxLength) {
        quill.deleteText(this.maxLength, quill.getLength());
        this.errorMessage.set(`Vous avez atteint la limite de ${this.maxLength} caractères.`);
      } else {
        this.errorMessage.set('');
      }
    });
  }

  defaultConfig: QuillOptions = {
    modules: {
      toolbar: [
        [{ header: [2, 3, 4, 5, 6, false] }], // title
        [{ size: ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        ['link', 'image', 'video'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ font: [] }],
        [{ align: [] }],
        ['clean'],
      ],
    },
  };

  get modules(): NonNullable<QuillOptions['modules']> {
    return (
      (this.customConfig?.modules as QuillModules) || (this.defaultConfig.modules as QuillModules)
    );
  }

  get editorConfig(): QuillOptions {
    return { ...this.defaultConfig, ...(this.customConfig ?? {}) };
  }

  /**
   * This method is called whenever the content of the editor changes.
   * It emits the updated content to the parent component via the contentChange event.
   * Useful for two-way binding or reacting to editor input in real-time.
   *
   * @param value The current content of the editor as a string
   */
  public onContentChange(value: string) {
    const cleaned = this.cleanQuillContent(value);
    this.content = cleaned;
    this.contentChange.emit(cleaned);
  }

  /**
   * This method is triggered by the (onEditorCreated) event of ngx-quill.
   * It receives the Quill instance, allowing to configure the editor dynamically.
   * Common uses include adding event listeners, enforcing limits, or customizing behavior.
   *
   * @param quillInstance The Quill editor instance created for this component
   */

  public registerQuill(quillInstance: Quill): void {
    quillInstance.on('text-change', () => {
      // longueur réelle (sans le \n final)
      const length = quillInstance.getLength() - 1;
      this.charCount.set(length);

      if (length >= this.maxLength) {
        quillInstance.deleteText(this.maxLength, quillInstance.getLength());
        this.errorMessage.set(`Vous avez atteint la limite de ${this.maxLength} caractères.`);
      } else {
        this.errorMessage.set('');
      }
    });
  }

  /**
   * Cleans the HTML content produced by Quill before saving or processing it.
   * Typical operations include removing empty <p> tags, trimming excessive whitespace,
   * and normalizing formatting.
   *
   * @param content The raw HTML content from the Quill editor
   * @returns The sanitized and cleaned HTML content
   */
  private cleanQuillContent(html: string): string {
    return html

      .replace(/<p>(\s|&nbsp;)*<\/p>/g, '') // removes strictly empty <p></p> tags (without <br>)

      .replace(/(&nbsp;|\s)+<\/p>/g, '</p>') // removes non-breaking and normal spaces at the end of paragraphs

      .replace(/([^\S\r\n]{2,})/g, ' ') // replaces multiple spaces with a single space (without affecting line breaks
      .trim();
  }
}
