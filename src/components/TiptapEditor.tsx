"use client";

import { JobForm } from "@/models/job.model";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { ControllerRenderProps } from "react-hook-form";
import { Toggle } from "./ui/toggle";
import { Bold, Heading2, Italic, List, ListOrdered } from "lucide-react";

const Tiptap = ({ field }: { field: ControllerRenderProps<any, any> }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          HTMLAttributes: {
            class: "text-xl",
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: "list-decimal pl-4",
          },
        },

        bulletList: {
          HTMLAttributes: {
            class: "list-disc pl-4",
          },
        },
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "min-h-[140px] border rounded-md px-3 py-2 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none",
      },
    },
    content: field.value,
    onUpdate: ({ editor }) => {
      field.onChange(editor.getHTML());
    },
  });

  return (
    <div className="flex flex-col gap-2">
      {editor && (
        <div className="border-input border rounded-md">
          <Toggle
            pressed={editor.isActive("bold")}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            size={"sm"}
          >
            <Bold className="w-4 h-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("italic")}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            size={"sm"}
          >
            <Italic className="w-4 h-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("heading", { level: 2 })}
            onPressedChange={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            size={"sm"}
          >
            <Heading2 className="w-4 h-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("orderedList")}
            onPressedChange={() =>
              editor.chain().focus().toggleOrderedList().run()
            }
            size={"sm"}
          >
            <ListOrdered className="w-4 h-4" />
          </Toggle>
          <Toggle
            pressed={editor.isActive("bulletList")}
            onPressedChange={() =>
              editor.chain().focus().toggleBulletList().run()
            }
            size={"sm"}
          >
            <List className="w-4 h-4" />
          </Toggle>
        </div>
      )}
      <EditorContent
        aria-labelledby="job-description-label"
        placeholder="enter here..."
        editor={editor}
      />
    </div>
  );
};

export default Tiptap;
