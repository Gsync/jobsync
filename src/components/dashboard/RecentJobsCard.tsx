import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobResponse } from "@/models/job.model";
import { format } from "date-fns";
import Link from "next/link";

export default function RecentJobsCard({ jobs }: { jobs: JobResponse[] }) {
  return (
    <Card className="mb-2">
      <CardHeader>
        <CardTitle>Recent Jobs Applied</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        {jobs.map((job) => (
          <div key={job.id} className="flex items-center gap-4">
            <Avatar className="hidden h-8 w-8 sm:flex">
              <AvatarImage
                src={job.Company?.logoUrl || "/images/jobsync-logo.svg"}
                alt="Avatar"
              />
              <AvatarFallback>JS</AvatarFallback>
            </Avatar>
            <Link href={`/dashboard/myjobs/${job?.id}`}>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">
                  {job.JobTitle?.label}
                </p>
                <p className="text-sm text-muted-foreground">
                  {job.Company?.label}
                </p>
              </div>
            </Link>
            <div className="ml-auto text-sm font-medium">
              {format(job?.appliedDate, "PP")}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
