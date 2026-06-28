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
  const { firstName, lastName, headline, email, phone, address, url1, url1Label, url2, url2Label } =
    contactInfo!;
  const contactParts = [email, phone, address].filter(Boolean).join(" · ");
  const isSafeUrl = (u: string) => {
    try {
      const p = new URL(u);
      return p.protocol === "https:" || p.protocol === "http:";
    } catch {
      return false;
    }
  };
  const urls = (
    [
      { url: url1, label: url1Label },
      { url: url2, label: url2Label },
    ] as { url?: string; label?: string }[]
  ).filter((e): e is { url: string; label?: string } => !!e.url && isSafeUrl(e.url));
  return (
    <Card>
      <CardHeader className="flex-row justify-between relative">
        <div>
          <CardTitle>
            {firstName} {lastName}
          </CardTitle>
          <CardDescription>{headline}</CardDescription>
          {contactParts && (
            <CardDescription>{contactParts}</CardDescription>
          )}
          {urls.length > 0 && (
            <CardDescription className="flex flex-col gap-1">
              {urls.map(({ url, label }) => (
                <span key={url}>
                  {label && <span>{label}: </span>}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 hover:opacity-80"
                  >
                    {url}
                  </a>
                </span>
              ))}
            </CardDescription>
          )}
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
