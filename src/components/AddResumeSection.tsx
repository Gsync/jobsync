"use client";
import { PlusCircle } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import AddContactInfo from "./AddContactInfo";
import { forwardRef, useImperativeHandle, useState } from "react";
import {
  ContactInfo,
  Resume,
  ResumeSection,
  SectionType,
} from "@/models/profile.model";
import AddResumeSummary from "./AddResumeSummary";

interface AddResumeSectionProps {
  resume: Resume;
}

export interface AddResumeSectionRef {
  openContactInfoDialog: (c: ContactInfo) => void;
  openSummaryDialog: (s: ResumeSection) => void;
}

const AddResumeSection = forwardRef<AddResumeSectionRef, AddResumeSectionProps>(
  ({ resume }, ref) => {
    const [contactInfoDialogOpen, setContactInfoDialogOpen] = useState(false);
    const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
    const [contactInfoToEdit, setContactInfoToEdit] =
      useState<ContactInfo | null>(null);
    const [summaryToEdit, setSummaryToEdit] = useState<ResumeSection | null>(
      null
    );
    useImperativeHandle(ref, () => ({
      openContactInfoDialog(contactInfo: ContactInfo) {
        setContactInfoDialogOpen(true);
        setContactInfoToEdit({ ...contactInfo });
      },
      openSummaryDialog(summarySection: ResumeSection) {
        setSummaryDialogOpen(true);
        setSummaryToEdit({ ...summarySection });
      },
    }));
    const summarySection = resume.ResumeSections.find(
      (section) => section.sectionType === SectionType.SUMMARY
    );
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-8 gap-1 cursor-pointer">
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add Section
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setContactInfoDialogOpen(true)}
                disabled={!!resume.ContactInfo}
              >
                Add Contact Info
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => setSummaryDialogOpen(true)}
                disabled={!!summarySection}
              >
                Add Summary
              </DropdownMenuItem>
              <DropdownMenuItem>Add Experience</DropdownMenuItem>
              <DropdownMenuItem>Add Education</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <AddContactInfo
          dialogOpen={contactInfoDialogOpen}
          setDialogOpen={setContactInfoDialogOpen}
          resumeId={resume.id}
          contactInfoToEdit={contactInfoToEdit}
        />
        <AddResumeSummary
          resumeId={resume.id}
          dialogOpen={summaryDialogOpen}
          setDialogOpen={setSummaryDialogOpen}
          summaryToEdit={summaryToEdit}
        />
      </>
    );
  }
);

AddResumeSection.displayName = "AddResumeSection";

export default AddResumeSection;
