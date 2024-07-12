"use client";
import { ResumeSection } from "@/models/profile.model";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Edit } from "lucide-react";
import { format } from "date-fns";
import { TipTapContentViewer } from "../TipTapContentViewer";

interface EducationCardProps {
  educationSection: ResumeSection | undefined;
  openDialogForEdit: (id: string) => void;
}

function EducationCard({
  educationSection,
  openDialogForEdit,
}: EducationCardProps) {
  return (
    <>
      <CardTitle className="pl-6 py-3">
        {educationSection?.sectionTitle}
      </CardTitle>
      {educationSection?.educations?.map((education) => (
        <Card key={education.id}>
          <CardHeader className="p-2 pb-0 flex-row justify-between relative">
            <CardTitle className="text-xl pl-4">
              {education.institution}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 absolute top-0 right-1"
              onClick={() => openDialogForEdit(education.id!)}
            >
              <Edit className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Edit
              </span>
            </Button>
          </CardHeader>
          <CardContent>
            <h3>
              {education.degree}, {education.fieldOfStudy}
            </h3>
            <CardDescription>
              {format(education.startDate, "MMM yyyy")} -{" "}
              {education.endDate
                ? format(education.endDate, "MMM yyyy")
                : "Present"}
              <br />
              {education.location.label}
            </CardDescription>
            {education.description ? (
              <div className="pt-2">
                <TipTapContentViewer content={education.description} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export default EducationCard;
