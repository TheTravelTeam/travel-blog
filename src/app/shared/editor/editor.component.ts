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
  encapsulation: ViewEncapsulation.None, // Disable Angular's style encapsulation so Quill's CSS can style the editor correctly
})
export class EditorComponent implements AfterViewInit {
  /******region ViewChildren*******/
  @ViewChild(QuillEditorComponent) editor!: QuillEditorComponent;
  /******region ViewChildren*******/

  /******region Input*******/
  @Input({ required: true }) content!: EditorProps['content'];
  @Input() customConfig: EditorProps['customConfig'];
  @Input() label: EditorProps['label'];
  @Input() placeholder: NonNullable<EditorProps['placeholder']> = editorDefaultProps['placeholder'];
  @Input() theme: NonNullable<EditorProps['theme']> = editorDefaultProps['theme'];
  @Input() readOnly: NonNullable<EditorProps['readonly']> = editorDefaultProps['readonly'];
  @Input() maxLength: NonNullable<EditorProps['maxLength']> = editorDefaultProps['maxLength'];
  /******endregion Input*******/

  /******region Ouput*******/
  @Output() contentChange = new EventEmitter<string>();
  /******endregion Ouput*******/

  /******region Signal*******/
  /**
   * Signals are a new reactive API built into Angular that simplifies local state management,
   * provides a better alternative to BehaviorSubject for simple cases, and automatically updates
   * your template when the value changes.
   */
  readonly errorMessage = signal('');
  readonly charCount = signal(0);
  /******region Signal*******/

  /**
   * Lifecycle hook called after the component's view has been initialized.
   * Registers a listener on the Quill editor instance to track text changes.
   * Updates the character count and enforces the maximum length limit.
   * @returns void
   */
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

  /**
   * Default Quill editor configuration.
   * Can be overridden from the parent component via
   * @Input() customConfig.
   *
   * Available toolbar options:
   * - [{ header: [2, 3, 4, 5, 6, false] }] : Heading levels (h2–h6) + normal text
   * - [{ size: ['small', false, 'large', 'huge'] }] : Text size
   * - ['bold', 'italic', 'underline', 'strike'] : Inline text formatting
   * - [{ color: [] }, { background: [] }] : Text color and background color
   * - ['link', 'image', 'video'] : Insert media (links, images, videos)
   * - [{ list: 'ordered' }, { list: 'bullet' }] : Ordered and unordered lists
   * - [{ font: [] }] : Font family
   * - [{ align: [] }] : Text alignment (left, center, right, justify)
   * - ['blockquote', 'code-block'] : Blockquote and code blocks
   * - ['clean'] : Remove all formatting
   */
  defaultConfig: QuillOptions = {
    modules: {
      toolbar: [
        [{ header: [2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ font: [] }],
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
    // const cleaned = this.cleanQuillContent(value);
    this.content = value;
    this.contentChange.emit(value);
  }

  /**
   * Returns the current editor content after cleaning it.
   * Cleans the content by removing empty paragraphs, extra spaces, and &nbsp; characters.
   * @returns The cleaned HTML content as a string.
   */
  public getCleanContent(): string {
    return this.cleanQuillContent(this.content);
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
    if (!html) return '';
    return html

      .replace(/&nbsp;/g, ' ') // replaces non-breaking HTML spaces (&nbsp;) with normal spaces

      .replace(/<p>(\s|&nbsp;)*<\/p>/g, '') // removes strictly empty <p></p> tags (without <br>)

      .replace(/(&nbsp;|\s)+<\/p>/g, '</p>') // removes non-breaking and normal spaces at the end of paragraphs

      .replace(/([^\S\r\n]{2,})/g, ' ') // replaces multiple spaces with a single space (without affecting line breaks)
      .trim();
  }
}
