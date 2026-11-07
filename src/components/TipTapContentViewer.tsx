"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

export const TipTapContentViewer = ({ content }: { content: string }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // StarterKit 3 additions; off to keep v2 output (links stay inert)
        link: false,
        underline: false,
        trailingNode: false,
        heading: {
          HTMLAttributes: {
            class: "text-xl",
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: "list-disc pl-4",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal pl-4",
          },
        },
      }),
    ],
    content: "",
    editable: false,
    immediatelyRender: false,
  });
  useEffect(() => {
    editor?.commands.setContent(content);
  }, [content, editor]);
  return <EditorContent editor={editor} />;
};
