import { Edit } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ResumeSection } from "@/models/profile.model";
import { TipTapContentViewer } from "../TipTapContentViewer";

interface SummarySectionCardProps {
  summarySection: ResumeSection | undefined;
  openDialogForEdit: () => void;
}

function SummarySectionCard({
  summarySection,
  openDialogForEdit,
}: SummarySectionCardProps) {
  const { sectionTitle, summary } = summarySection!;
  return (
    <>
      <CardTitle className="pl-6 py-3">{sectionTitle}</CardTitle>
      <Card>
        <CardHeader className="p-2 pb-0 flex-row justify-end items-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={openDialogForEdit}
          >
            <Edit className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Edit
            </span>
          </Button>
        </CardHeader>
        <CardContent>
          <TipTapContentViewer content={summary?.content!} />
        </CardContent>
      </Card>
    </>
  );
}

export default SummarySectionCard;
