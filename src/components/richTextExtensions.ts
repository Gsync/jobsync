import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import type { Extensions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

export const richTextExtensions: Extensions = [
  StarterKit.configure({
    // StarterKit 3 additions; off to keep v2 output (links stay inert)
    link: false,
    underline: false,
    trailingNode: false,
    // replaced by CodeBlockLowlight below: same node, highlighted
    codeBlock: false,
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
  CodeBlockLowlight.configure({ lowlight }),
];
