"use client";

import { Edit } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ResumeSection } from "@/models/profile.model";
import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface SummarySectionCardProps {
  summarySection: ResumeSection | undefined;
  openDialogForEdit: () => void;
}

function SummarySectionCard({
  summarySection,
  openDialogForEdit,
}: SummarySectionCardProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editable: false,
  });
  useEffect(() => {
    editor?.commands.setContent(summarySection?.summary?.content!);
  });
  return (
    <>
      <Card>
        <CardHeader className="flex-row justify-between relative">
          <div>
            <CardTitle>{summarySection?.sectionTitle}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 absolute top-0 right-1"
            onClick={openDialogForEdit}
          >
            <Edit className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Edit
            </span>
          </Button>
        </CardHeader>
        <CardContent>
          <EditorContent editor={editor} />
        </CardContent>
      </Card>
    </>
  );
}

export default SummarySectionCard;
