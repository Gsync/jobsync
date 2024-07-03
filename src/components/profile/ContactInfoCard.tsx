"use client";
import { ContactInfo } from "@/models/profile.model";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Edit } from "lucide-react";

interface ContactInfoCardProps {
  contactInfo: ContactInfo | undefined;
  openDialog: () => void;
}

function ContactInfoCard({ contactInfo, openDialog }: ContactInfoCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row justify-between relative">
        <div>
          <CardTitle>
            {contactInfo?.firstName} {contactInfo?.lastName}
          </CardTitle>
          <CardDescription>{contactInfo?.headline}</CardDescription>
          <CardDescription>
            {contactInfo?.email} - {contactInfo?.phone} - {contactInfo?.address}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 absolute top-0 right-1"
          onClick={openDialog}
        >
          <Edit className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Edit
          </span>
        </Button>
      </CardHeader>
    </Card>
  );
}

export default ContactInfoCard;
