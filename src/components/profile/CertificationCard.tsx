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
import { Edit, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface CertificationCardProps {
  certificationSection: ResumeSection | undefined;
  openDialogForEdit: (id: string) => void;
}

function CertificationCard({
  certificationSection,
  openDialogForEdit,
}: CertificationCardProps) {
  const { sectionTitle, licenseOrCertifications } = certificationSection!;
  return (
    <>
      <CardTitle className="pl-6 py-3">{sectionTitle}</CardTitle>
      {licenseOrCertifications?.map(
        ({
          id,
          title,
          organization,
          issueDate,
          expirationDate,
          credentialUrl,
        }) => (
          <Card key={id}>
            <CardHeader className="p-2 pb-0 flex-row justify-between relative">
              <CardTitle className="text-xl pl-4">{title}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 absolute top-0 right-1"
                onClick={() => openDialogForEdit(id!)}
              >
                <Edit className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Edit
                </span>
              </Button>
            </CardHeader>
            <CardContent>
              <h3>{organization}</h3>
              <CardDescription>
                {issueDate && (
                  <>Issued: {format(new Date(issueDate), "MMM yyyy")}</>
                )}
                {issueDate && expirationDate && " · "}
                {expirationDate ? (
                  <>Expires: {format(new Date(expirationDate), "MMM yyyy")}</>
                ) : (
                  issueDate && " · No Expiration"
                )}
              </CardDescription>
              {credentialUrl && (
                <a
                  href={credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline mt-1"
                >
                  View Credential
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </CardContent>
          </Card>
        ),
      )}
    </>
  );
}

export default CertificationCard;
