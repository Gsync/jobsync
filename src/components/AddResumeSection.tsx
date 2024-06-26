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
import { Resume } from "@/models/profile.model";

interface AddResumeSectionProps {
  resume: Resume;
}

export interface AddResumeSectionRef {
  openDialog: () => void;
}

const AddResumeSection = forwardRef<AddResumeSectionRef, AddResumeSectionProps>(
  ({ resume }, ref) => {
    const [contactInfoDialogOpen, setContactInfoDialogOpen] = useState(false);
    useImperativeHandle(ref, () => ({
      openDialog() {
        setContactInfoDialogOpen(true);
      },
    }));
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
              <DropdownMenuItem>Add Summary</DropdownMenuItem>
              <DropdownMenuItem>Add Experience</DropdownMenuItem>
              <DropdownMenuItem>Add Education</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <AddContactInfo
          dialogOpen={contactInfoDialogOpen}
          setDialogOpen={setContactInfoDialogOpen}
          resumeId={resume.id}
          contactInfoToEdit={resume.ContactInfo}
        />
      </>
    );
  }
);

AddResumeSection.displayName = "AddResumeSection";

export default AddResumeSection;
