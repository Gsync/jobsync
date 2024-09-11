"use client";
import { PlusCircle } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import AddContactInfo from "./AddContactInfo";
import { forwardRef, useImperativeHandle, useState } from "react";
import {
  ContactInfo,
  Resume,
  ResumeSection,
  SectionType,
} from "@/models/profile.model";
import AddResumeSummary from "./AddResumeSummary";
import AddExperience from "./AddExperience";
import AddEducation from "./AddEducation";

interface AddResumeSectionProps {
  resume: Resume;
}

export interface AddResumeSectionRef {
  openContactInfoDialog: (c: ContactInfo) => void;
  openSummaryDialog: (s: ResumeSection) => void;
  openExperienceDialog: (s: ResumeSection) => void;
  openEducationDialog: (s: ResumeSection) => void;
}

const AddResumeSection = forwardRef<AddResumeSectionRef, AddResumeSectionProps>(
  ({ resume }, ref) => {
    const [contactInfoDialogOpen, setContactInfoDialogOpen] = useState(false);
    const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
    const [experienceDialogOpen, setExperienceDialogOpen] = useState(false);
    const [educationDialogOpen, setEducationDialogOpen] = useState(false);
    const [contactInfoToEdit, setContactInfoToEdit] =
      useState<ContactInfo | null>(null);
    const [summaryToEdit, setSummaryToEdit] = useState<ResumeSection | null>(
      null
    );
    const [experienceToEdit, setExperienceToEdit] =
      useState<ResumeSection | null>(null);
    const [educationToEdit, setEducationToEdit] =
      useState<ResumeSection | null>(null);
    useImperativeHandle(ref, () => ({
      openContactInfoDialog(contactInfo: ContactInfo) {
        setContactInfoDialogOpen(true);
        setContactInfoToEdit({ ...contactInfo });
      },
      openSummaryDialog(summarySection: ResumeSection) {
        setSummaryDialogOpen(true);
        setSummaryToEdit({ ...summarySection });
      },
      openExperienceDialog(experienceSection: ResumeSection) {
        setExperienceDialogOpen(true);
        setExperienceToEdit({ ...experienceSection });
      },
      openEducationDialog(educationSection: ResumeSection) {
        setEducationDialogOpen(true);
        setEducationToEdit({ ...educationSection });
      },
    }));
    const summarySection = resume?.ResumeSections?.find(
      (section) => section.sectionType === SectionType.SUMMARY
    );
    const experienceSection = resume?.ResumeSections?.find(
      (section) => section.sectionType === SectionType.EXPERIENCE
    );
    const educationSection = resume?.ResumeSections?.find(
      (section) => section.sectionType === SectionType.EDUCATION
    );
    const resetExperienceToEdit = () => {
      setExperienceToEdit(null);
    };
    const resetEducationToEdit = () => {
      setEducationToEdit(null);
    };
    const openContactInfoDialog = () => setContactInfoDialogOpen(true);
    const openSummaryDialog = () => setSummaryDialogOpen(true);
    const openExperienceDialog = () => {
      if (experienceToEdit) {
        resetExperienceToEdit();
      }
      setExperienceDialogOpen(true);
    };
    const openEducationDialog = () => {
      if (educationToEdit) {
        resetEducationToEdit();
      }
      setEducationDialogOpen(true);
    };
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 cursor-pointer"
            >
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
                onClick={openContactInfoDialog}
                disabled={!!resume?.ContactInfo}
              >
                Add Contact Info
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={openSummaryDialog}
                disabled={!!summarySection}
              >
                Add Summary
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={openExperienceDialog}
              >
                Add Experience
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={openEducationDialog}
              >
                Add Education
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <AddContactInfo
          resumeId={resume?.id}
          dialogOpen={contactInfoDialogOpen}
          setDialogOpen={setContactInfoDialogOpen}
          contactInfoToEdit={contactInfoToEdit}
        />
        <AddResumeSummary
          resumeId={resume?.id}
          dialogOpen={summaryDialogOpen}
          setDialogOpen={setSummaryDialogOpen}
          summaryToEdit={summaryToEdit}
        />
        <AddExperience
          resumeId={resume?.id}
          sectionId={experienceSection?.id}
          dialogOpen={experienceDialogOpen}
          setDialogOpen={setExperienceDialogOpen}
          experienceToEdit={experienceToEdit!}
        />
        <AddEducation
          resumeId={resume?.id}
          sectionId={educationSection?.id}
          dialogOpen={educationDialogOpen}
          setDialogOpen={setEducationDialogOpen}
          educationToEdit={educationToEdit!}
        />
      </>
    );
  }
);

AddResumeSection.displayName = "AddResumeSection";

export default AddResumeSection;
