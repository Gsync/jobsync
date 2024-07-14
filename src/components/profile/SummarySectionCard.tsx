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
      <Card>
        <CardHeader className="flex-row justify-between relative">
          <CardTitle>{sectionTitle}</CardTitle>
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
          <TipTapContentViewer content={summary?.content!} />
        </CardContent>
      </Card>
    </>
  );
}

export default SummarySectionCard;
