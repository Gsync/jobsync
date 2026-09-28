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
import { Pencil, ExternalLink, Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";

interface CertificationCardProps {
  certificationSection: ResumeSection | undefined;
  openDialogForEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function CertificationCard({
  certificationSection,
  openDialogForEdit,
  onDelete,
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
              <div className="flex gap-1 absolute top-2 right-2">
                <Button
                  title="Edit"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openDialogForEdit(id!)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit</span>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      title="Delete"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete certification?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove &quot;{title}&quot; from this resume.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive-bg text-destructive-foreground hover:bg-destructive-bg/90"
                        onClick={() => onDelete(id!)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
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
