import { QuillOptions } from 'quill';

export type EditorProps = {
  content: string;
  customConfig?: QuillOptions;
  label?: string;
  maxLength?: number;
  placeholder?: string;
  readonly?: boolean;
  theme?: 'snow' | 'bubble';
};

export const editorDefaultProps: Required<Omit<EditorProps, 'content' | 'customConfig' | 'label'>> =
  {
    placeholder: 'Écris ton texte ici...',
    maxLength: 50,
    readonly: false,
    theme: 'snow',
  };
