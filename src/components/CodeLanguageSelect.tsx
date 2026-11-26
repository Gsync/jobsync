"use client";

import type { Editor } from "@tiptap/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

// "auto" stands for no language: Radix Select rejects "" as an item value
export const CODE_LANGUAGES: { value: string; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  { value: "plaintext", label: "Plain text" },
  { value: "bash", label: "Bash" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "css", label: "CSS" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "javascript", label: "JavaScript" },
  { value: "json", label: "JSON" },
  { value: "kotlin", label: "Kotlin" },
  { value: "php", label: "PHP" },
  { value: "python", label: "Python" },
  { value: "ruby", label: "Ruby" },
  { value: "rust", label: "Rust" },
  { value: "sql", label: "SQL" },
  { value: "swift", label: "Swift" },
  { value: "typescript", label: "TypeScript" },
  { value: "xml", label: "HTML / XML" },
  { value: "yaml", label: "YAML" },
];

// "" shows the placeholder for a language the list lacks, e.g. an agent's ts
const selectValue = (language: string | null) => {
  if (language === null) return "auto";
  return CODE_LANGUAGES.some((l) => l.value === language) ? language : "";
};

export function CodeLanguageSelect({ editor }: { editor: Editor }) {
  const language: string | null =
    editor.getAttributes("codeBlock").language ?? null;

  return (
    <Select
      value={selectValue(language)}
      onValueChange={(value) =>
        editor
          .chain()
          .focus()
          .updateAttributes("codeBlock", {
            language: value === "auto" ? null : value,
          })
          .run()
      }
    >
      <SelectTrigger
        aria-label="Code language"
        className="inline-flex h-8 w-36 align-middle"
      >
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent
        // Radix refocuses its trigger after the editor, so typing hits typeahead
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          editor.commands.focus();
        }}
      >
        {CODE_LANGUAGES.map((l) => (
          <SelectItem key={l.value} value={l.value}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
