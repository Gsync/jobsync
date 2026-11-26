"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect } from "react";
import { richTextExtensions } from "./richTextExtensions";

export const TipTapContentViewer = ({ content }: { content: string }) => {
  const editor = useEditor({
    extensions: richTextExtensions,
    content: "",
    editable: false,
    immediatelyRender: false,
  });
  useEffect(() => {
    editor?.commands.setContent(content);
  }, [content, editor]);
  return <EditorContent editor={editor} />;
};
