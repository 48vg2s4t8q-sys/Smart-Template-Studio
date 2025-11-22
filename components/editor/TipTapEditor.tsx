
import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { Image } from '@tiptap/extension-image';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Extension } from '@tiptap/core';
import { Bold, Italic, Underline as UnderlineIcon } from 'lucide-react';

const { useEffect } = React;

// Define FontSize extension inline
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style?.fontSize?.replace(/['"]+/g, '') || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }: any) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }: any) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

interface TipTapEditorProps {
  content: string;
  editable?: boolean;
  onUpdate: (content: string) => void;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({ content, editable = true, onUpdate }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image,
      Underline,
      TextStyle,
      FontFamily,
      FontSize
    ],
    content: content,
    editable: editable,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose focus:outline-none max-w-none w-full',
      },
    },
  });

  // Sync external content changes (e.g. from AI) to editor
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      const currentContent = editor.getHTML();
      if (content !== currentContent) {
         editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="relative w-full h-full group">
      {editable && editor.isFocused && (
        <div className="absolute bottom-full left-0 mb-2 z-50 flex items-center gap-1 p-1 bg-white rounded-lg shadow-lg border border-gray-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${editor.isActive('bold') ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600'}`}
              title="Bold"
            >
              <Bold size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${editor.isActive('italic') ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600'}`}
              title="Italic"
            >
              <Italic size={14} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${editor.isActive('underline') ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600'}`}
              title="Underline"
            >
              <UnderlineIcon size={14} />
            </button>
            
            <div className="w-px h-4 bg-gray-200 mx-1" />
            
            <select 
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[100px] cursor-pointer text-gray-700"
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    editor.chain().focus().setFontFamily(value).run();
                  } else {
                    editor.chain().focus().unsetFontFamily().run();
                  }
                }}
                value={editor.getAttributes('textStyle').fontFamily || ''}
            >
                <option value="">Default Font</option>
                <option value="Inter, sans-serif">Inter</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="Courier New, monospace">Courier</option>
                <option value="Comic Sans MS, cursive">Comic Sans</option>
            </select>

            <select 
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-[70px] cursor-pointer text-gray-700"
                onChange={(e) => {
                    if(e.target.value) {
                        // @ts-ignore - dynamic command
                        editor.chain().focus().setFontSize(e.target.value).run();
                    } else {
                        // @ts-ignore - dynamic command
                        editor.chain().focus().unsetFontSize().run();
                    }
                }}
                value={editor.getAttributes('textStyle').fontSize || ''}
            >
                <option value="">Size</option>
                <option value="12px">12px</option>
                <option value="14px">14px</option>
                <option value="16px">16px</option>
                <option value="18px">18px</option>
                <option value="20px">20px</option>
                <option value="24px">24px</option>
                <option value="32px">32px</option>
            </select>
        </div>
      )}
      <EditorContent editor={editor} className="w-full h-full" />
    </div>
  );
};
