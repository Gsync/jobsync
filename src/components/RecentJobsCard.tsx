import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default function RecentJobsCard({ jobs }: { jobs: any[] }) {
  console.log("RECENT JOBS: ", jobs[0]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Jobs Applied</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        {jobs.map((job) => (
          <div key={job.id} className="flex items-center gap-4">
            <Avatar className="hidden h-9 w-9 sm:flex">
              <AvatarImage src="/icons/google-logo.svg" alt="Avatar" />
              <AvatarFallback>MS</AvatarFallback>
            </Avatar>
            <div className="grid gap-1">
              <p className="text-sm font-medium leading-none">
                {job.JobTitle?.label}
              </p>
              <p className="text-sm text-muted-foreground">
                {job.Company?.label}
              </p>
            </div>
            <div className="ml-auto font-medium">
              {format(job.appliedDate, "PP")}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
