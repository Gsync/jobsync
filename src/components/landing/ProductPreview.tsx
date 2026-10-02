import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProductPreview() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Search overview</CardTitle>
          <Badge variant="secondary">Example workspace</Badge>
        </div>
        <CardDescription>A clear view of your next move.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 pt-4">
        <dl className="grid grid-cols-3 gap-3">
          {[
            ["Applications", "12"],
            ["Interviews", "3"],
            ["Follow-ups", "2"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <div>
          <h3 className="mb-3 text-sm font-medium">Recent applications</h3>
          <ul className="divide-y">
            {[
              ["Product designer", "Example Studio", "Interview"],
              ["Frontend engineer", "Example Labs", "Applied"],
              ["Design engineer", "Example Works", "Saved"],
            ].map(([title, company, status]) => (
              <li
                key={title}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{company}</p>
                </div>
                <Badge variant="outline">{status}</Badge>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-3 rounded-md bg-muted p-3 text-sm">
          <FileText
            className="size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span>Next up: prepare your resume for an interview.</span>
        </div>
      </CardContent>
    </Card>
  );
}
