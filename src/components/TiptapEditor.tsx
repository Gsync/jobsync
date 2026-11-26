"use client";

import { JobForm } from "@/models/job.model";
import { useEditor, EditorContent } from "@tiptap/react";

import { ControllerRenderProps } from "react-hook-form";
import { richTextExtensions } from "./richTextExtensions";
import { Toggle } from "./ui/toggle";
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  SquareCode,
} from "lucide-react";
import { CodeLanguageSelect } from "./CodeLanguageSelect";

const Tiptap = ({
  field,
  codeBlocks = false,
}: {
  field: ControllerRenderProps<any, any>;
  codeBlocks?: boolean;
}) => {
  const editor = useEditor({
    extensions: richTextExtensions,
    editorProps: {
      attributes: {
        class:
          "min-h-[140px] border rounded-md px-3 py-2 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-hidden",
      },
    },
    content: field.value,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
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
          {codeBlocks && (
            <Toggle
              aria-label="Code block"
              pressed={editor.isActive("codeBlock")}
              onPressedChange={() =>
                editor.chain().focus().toggleCodeBlock().run()
              }
              size={"sm"}
            >
              <SquareCode className="w-4 h-4" />
            </Toggle>
          )}
          {codeBlocks && editor.isActive("codeBlock") && (
            <CodeLanguageSelect editor={editor} />
          )}
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
