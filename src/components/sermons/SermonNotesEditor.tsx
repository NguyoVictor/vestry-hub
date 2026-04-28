import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bold, Italic, Underline as UnderlineIcon, Highlighter, Quote,
  Heading1, Heading2, Heading3, List, ListOrdered, Lock, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import './SermonNotesEditor.css';

interface SermonNotesEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  isSaving: boolean;
  lastSaved: Date | null;
}

export default function SermonNotesEditor({
  initialContent,
  onSave,
  isSaving,
  lastSaved,
}: SermonNotesEditorProps) {
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showBubbleMenu, setShowBubbleMenu] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Start taking notes... only you can see this.',
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3 font-jakarta',
      },
    },
    onUpdate: ({ editor }) => {
      // Clear existing timeout
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }

      // Set new timeout for auto-save (1000ms debounce)
      const timeout = setTimeout(() => {
        const html = editor.getHTML();
        onSave(html);
      }, 1000);

      setSaveTimeout(timeout);
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      setShowBubbleMenu(from !== to);
    },
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive, 
    icon: Icon, 
    label 
  }: { 
    onClick: () => void; 
    isActive?: boolean; 
    icon: any; 
    label: string;
  }) => (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        'p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
        isActive && 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
      )}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-slate-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-jakarta">
              My Personal Notes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-jakarta">
              Only visible to you
            </p>
          </div>
        </div>

        {/* Save indicator */}
        <AnimatePresence mode="wait">
          {isSaving ? (
            <motion.div
              key="saving"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-1.5 text-xs text-slate-500 font-jakarta"
            >
              <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
              Saving...
            </motion.div>
          ) : lastSaved ? (
            <motion.div
              key="saved"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-jakarta"
            >
              <Check className="h-3 w-3" />
              Saved
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Editor Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Fixed Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            icon={Heading1}
            label="Heading 1"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            icon={Heading2}
            label="Heading 2"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            icon={Heading3}
            label="Heading 3"
          />
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            icon={Bold}
            label="Bold"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            icon={Italic}
            label="Italic"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            icon={UnderlineIcon}
            label="Underline"
          />
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            icon={List}
            label="Bullet List"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            icon={ListOrdered}
            label="Numbered List"
          />
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            icon={Quote}
            label="Quote"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            icon={Highlighter}
            label="Highlight"
          />
        </div>

        {/* Editor Content */}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
