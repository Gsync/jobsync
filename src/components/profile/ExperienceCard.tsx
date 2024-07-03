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
import { Editor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

interface ExperienceCardProps {
  experienceSection: ResumeSection | undefined;
  openDialogForEdit: (id: string) => void;
}

function ExperienceCard({
  experienceSection,
  openDialogForEdit,
}: ExperienceCardProps) {
  return (
    <>
      <CardTitle className="pl-6 py-3">
        {experienceSection?.sectionTitle}
      </CardTitle>
      {experienceSection?.workExperiences?.map((experience) => (
        <Card key={experience.id}>
          <CardHeader className="p-2 pb-0 flex-row justify-between relative">
            <CardTitle className="text-xl pl-4">
              {experience.jobTitle.label}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 absolute top-0 right-1"
              onClick={() => openDialogForEdit(experience.id!)}
            >
              <Edit className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Edit
              </span>
            </Button>
          </CardHeader>
          <CardContent>
            <h3>{experience.Company.label}</h3>
            <CardDescription>
              {format(experience.startDate, "MMM yyyy")} -{" "}
              {experience.endDate
                ? format(experience.endDate, "MMM yyyy")
                : "Present"}
              <div>{experience.location.label}</div>
            </CardDescription>
            <div className="pt-2">
              <EditorContent
                editor={
                  new Editor({
                    extensions: [StarterKit],
                    content: experience.description,
                    editable: false,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export default ExperienceCard;
