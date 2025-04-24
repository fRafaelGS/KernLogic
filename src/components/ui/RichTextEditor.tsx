import React from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import CharacterCount from '@tiptap/extension-character-count';
import { Bold, Italic, List, ListOrdered, Link2 } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (richText: string) => void;
  limit?: number;
  disabled?: boolean;
  error?: boolean; // To pass error state for styling
}

const Toolbar = ({ editor, limit }: { editor: Editor | null, limit?: number }) => {
  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }
    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex items-center gap-1 border border-b-0 rounded-t-md p-2 bg-enterprise-50">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={cn("h-7 px-2", editor.isActive('bold') ? 'bg-enterprise-100 text-enterprise-900' : 'text-enterprise-600')}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={cn("h-7 px-2", editor.isActive('italic') ? 'bg-enterprise-100 text-enterprise-900' : 'text-enterprise-600')}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn("h-7 px-2", editor.isActive('bulletList') ? 'bg-enterprise-100 text-enterprise-900' : 'text-enterprise-600')}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn("h-7 px-2", editor.isActive('orderedList') ? 'bg-enterprise-100 text-enterprise-900' : 'text-enterprise-600')}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={setLink}
        className={cn("h-7 px-2", editor.isActive('link') ? 'bg-enterprise-100 text-enterprise-900' : 'text-enterprise-600')}
      >
        <Link2 className="h-4 w-4" />
      </Button>
      {limit && (
        <div className="ml-auto text-xs text-enterprise-500">
          {editor.storage.characterCount.characters()} / {limit} characters
        </div>
      )}
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, limit, disabled, error }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
         heading: false, // Disable headings for minimalist toolbar
         blockquote: false,
         codeBlock: false,
         hardBreak: false,
         horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      CharacterCount.configure({
        limit,
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none min-h-[150px] rounded-b-md border border-enterprise-200 p-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          error && 'border-danger-500 focus:ring-danger-500 focus:border-danger-500',
          disabled && 'bg-enterprise-50 cursor-not-allowed opacity-70'
        ),
      },
    },
  });

  return (
    <div>
      <Toolbar editor={editor} limit={limit} />
      <EditorContent editor={editor} />
    </div>
  );
}; 