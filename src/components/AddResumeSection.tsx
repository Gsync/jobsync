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
import { useState } from "react";
import { Resume } from "@/models/profile.model";

function AddResumeSection({ resume }: { resume: Resume }) {
  const [contactInfoDialogOpen, setcontactInfoDialogOpen] = useState(false);

  const addResumeSection = () => {};

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="h-8 gap-1" onClick={addResumeSection}>
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
              onClick={() => setcontactInfoDialogOpen(true)}
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
        setDialogOpen={setcontactInfoDialogOpen}
        resumeId={resume.id}
      />
    </>
  );
}

export default AddResumeSection;
