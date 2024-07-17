"use client";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

export const TipTapContentViewer = ({ content }: { content: string }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editable: false,
  });
  useEffect(() => {
    editor?.commands.setContent(content);
  });
  return <EditorContent editor={editor} />;
};
