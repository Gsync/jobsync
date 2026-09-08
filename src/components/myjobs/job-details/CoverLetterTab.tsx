"use client";

import { format } from "date-fns";
import { FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TipTapContentViewer } from "@/components/TipTapContentViewer";
import type { CoverLetter } from "@/models/profile.model";
import { JobTabEmptyState } from "./JobTabEmptyState";

type CoverLetterTabProps = {
  letter?: CoverLetter;
  blockedReason?: string;
  onGenerate: () => void;
};

export function CoverLetterTab({
  letter,
  blockedReason,
  onGenerate,
}: CoverLetterTabProps) {
  if (!letter) {
    return (
      <JobTabEmptyState
        icon={FileText}
        title="No cover letter yet"
        description="Generate one from your resume and this posting. You can edit and export it afterwards from Profile."
        actionLabel="Generate Cover Letter"
        onAction={onGenerate}
        actionDisabled={!!blockedReason}
        actionTitle={blockedReason}
      />
    );
  }

  const generatedAt = letter.updatedAt ?? letter.createdAt;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {letter.title}
          {generatedAt &&
            ` · Generated ${format(new Date(generatedAt), "PP")}`}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto cursor-pointer"
          onClick={onGenerate}
          disabled={!!blockedReason}
          title={blockedReason}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Regenerate
        </Button>
      </div>
      <TipTapContentViewer content={letter.content} />
    </div>
  );
}
