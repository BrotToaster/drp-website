"use client";

import type { JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { emptyContent } from "@/lib/content";

export function RichTextEditor({
  name = "content",
  initialContent,
}: {
  name?: string;
  initialContent?: JSONContent;
}) {
  const [value, setValue] = useState<JSONContent>(initialContent || emptyContent);
  const editor = useEditor({
    immediatelyRender: false,
    content: initialContent || emptyContent,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image.configure({ allowBase64: false }),
      Placeholder.configure({ placeholder: "Inhalt verfassen …" }),
    ],
    onUpdate({ editor: current }) {
      setValue(current.getJSON());
    },
  });

  const setLink = () => {
    if (!editor) return;
    const current = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link (https://…)", current || "https://");
    if (href === null) return;
    if (!href) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  const button = (active = false) =>
    "editor-button" + (active ? " editor-button-active" : "");

  return (
    <div className="editor-shell">
      <input type="hidden" name={name} value={JSON.stringify(value)} />
      <div className="editor-toolbar" aria-label="Textformatierung">
        <button type="button" className={button(editor?.isActive("bold"))} onClick={() => editor?.chain().focus().toggleBold().run()} aria-label="Fett"><strong>F</strong></button>
        <button type="button" className={button(editor?.isActive("italic"))} onClick={() => editor?.chain().focus().toggleItalic().run()} aria-label="Kursiv"><em>K</em></button>
        <button type="button" className={button(editor?.isActive("heading", { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" className={button(editor?.isActive("heading", { level: 3 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button type="button" className={button(editor?.isActive("bulletList"))} onClick={() => editor?.chain().focus().toggleBulletList().run()}>• Liste</button>
        <button type="button" className={button(editor?.isActive("orderedList"))} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. Liste</button>
        <button type="button" className={button(editor?.isActive("blockquote"))} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>Zitat</button>
        <button type="button" className={button(editor?.isActive("link"))} onClick={setLink}>Link</button>
        <button type="button" className={button()} onClick={() => editor?.chain().focus().undo().run()} aria-label="Rückgängig">↶</button>
        <button type="button" className={button()} onClick={() => editor?.chain().focus().redo().run()} aria-label="Wiederholen">↷</button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}