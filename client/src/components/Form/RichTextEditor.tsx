import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import './RichTextEditor.css';

interface RichTextEditorProps {
  name: string;
  value: string;
  onChange: (name: string, html: string) => void;
  onBlur?: () => void;
  label?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  compact?: boolean;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  icon: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive,
  disabled,
  title,
  icon,
}) => (
  <button
    type="button"
    className={`wt-rte-btn${isActive ? ' active' : ''}`}
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
  >
    <i className={`fa fa-${icon}`} aria-hidden="true" />
  </button>
);

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  name,
  value,
  onChange,
  onBlur,
  label,
  required,
  error,
  placeholder,
  compact,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'wt-rte-content',
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(name, ed.getHTML());
    },
    onBlur: () => {
      onBlur?.();
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Image URL', 'https://');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="form-group">
      {label && (
        <label className="control-label">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <div className={`wt-rte${compact ? ' wt-rte-compact' : ''}${error ? ' wt-rte-error' : ''}`}>
        <div className="wt-rte-toolbar" role="toolbar" aria-label="Text formatting">
          <div className="wt-rte-group">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold"
              icon="bold"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic"
              icon="italic"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Underline"
              icon="underline"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
              icon="strikethrough"
            />
          </div>

          {!compact && (
            <div className="wt-rte-group">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
                icon="header"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
                icon="header"
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
                icon="header"
              />
            </div>
          )}

          <div className="wt-rte-group">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet list"
              icon="list-ul"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered list"
              icon="list-ol"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Blockquote"
              icon="quote-left"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              title="Code block"
              icon="code"
            />
          </div>

          <div className="wt-rte-group">
            <ToolbarButton
              onClick={setLink}
              isActive={editor.isActive('link')}
              title="Insert link"
              icon="link"
            />
            {!compact && (
              <>
                <ToolbarButton onClick={addImage} title="Insert image" icon="image" />
                <ToolbarButton
                  onClick={() =>
                    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
                  }
                  title="Insert table"
                  icon="table"
                />
              </>
            )}
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal rule"
              icon="minus"
            />
          </div>

          <div className="wt-rte-group">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
              icon="undo"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
              icon="repeat"
            />
          </div>
        </div>
        <EditorContent editor={editor} />
      </div>
      {error && <span className="help-block text-danger">{error}</span>}
    </div>
  );
};

export default RichTextEditor;
