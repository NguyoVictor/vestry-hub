import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TipTapEditorProps {
  /** HTML string value controlled by the parent */
  value: string;
  /** Called with the new HTML string on every change */
  onChange: (html: string) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional additional className for the wrapper */
  className?: string;
  /** Whether the editor is disabled */
  disabled?: boolean;
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-8 w-8 p-0 font-jakarta",
        isActive
          ? "bg-orange-100 text-orange-600 hover:bg-orange-100 hover:text-orange-600"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      {children}
    </Button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TipTapEditor({
  value,
  onChange,
  placeholder = "Write your announcement…",
  className,
  disabled = false,
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Restrict heading to level 2 only
        heading: { levels: [2] },
        // Link is included in StarterKit v3 — configure it here
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: "text-orange-500 underline underline-offset-2 cursor-pointer",
            rel: "noopener noreferrer",
            target: "_blank",
          },
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !disabled,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Subscribe to editor state for reactive toolbar active states
  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive("bold"),
      isItalic: ctx.editor.isActive("italic"),
      isBulletList: ctx.editor.isActive("bulletList"),
      isOrderedList: ctx.editor.isActive("orderedList"),
      isHeading2: ctx.editor.isActive("heading", { level: 2 }),
      isLink: ctx.editor.isActive("link"),
    }),
  });

  // ── Link handler ────────────────────────────────────────────────────────────
  const handleLinkToggle = useCallback(() => {
    if (!editor) return;

    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const url = window.prompt("Enter URL");
    if (!url) return;

    // Prepend https:// if no protocol is provided
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    editor.chain().focus().setLink({ href }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "font-jakarta rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/10 transition-all",
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 dark:border-slate-700">
        <ToolbarButton
          title="Bold (⌘B)"
          isActive={editorState?.isBold}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Italic (⌘I)"
          isActive={editorState?.isItalic}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

        <ToolbarButton
          title="Bullet List"
          isActive={editorState?.isBulletList}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Ordered List"
          isActive={editorState?.isOrderedList}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

        <ToolbarButton
          title="Heading 2"
          isActive={editorState?.isHeading2}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Link"
          isActive={editorState?.isLink}
          disabled={disabled}
          onClick={handleLinkToggle}
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* ── Editor Content ───────────────────────────────────────────────────── */}
      <EditorContent
        editor={editor}
        className={cn(
          "prose prose-sm max-w-none px-4 py-3 min-h-[160px]",
          "prose-headings:font-semibold prose-headings:text-slate-900 dark:prose-headings:text-slate-100",
          "prose-p:text-slate-700 dark:prose-p:text-slate-300",
          "prose-a:text-orange-500 prose-a:no-underline hover:prose-a:underline",
          "prose-ul:text-slate-700 dark:prose-ul:text-slate-300",
          "prose-ol:text-slate-700 dark:prose-ol:text-slate-300",
          // Placeholder styling (injected by TipTap's Placeholder extension)
          "[&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:text-slate-400",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:float-left",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:h-0",
          // Focus outline handled by wrapper
          "[&_.tiptap]:outline-none"
        )}
      />
    </div>
  );
}
