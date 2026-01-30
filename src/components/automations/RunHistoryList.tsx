"use client";

import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Ban,
  Timer,
  History,
} from "lucide-react";
import type { AutomationRun } from "@/models/automation.model";

interface RunHistoryListProps {
  runs: AutomationRun[];
}

const STATUS_CONFIG = {
  running: { icon: Clock, color: "text-blue-500", variant: "secondary" as const },
  completed: { icon: CheckCircle2, color: "text-green-500", variant: "default" as const },
  failed: { icon: XCircle, color: "text-red-500", variant: "destructive" as const },
  completed_with_errors: { icon: AlertCircle, color: "text-amber-500", variant: "secondary" as const },
  blocked: { icon: Ban, color: "text-red-500", variant: "destructive" as const },
  rate_limited: { icon: Timer, color: "text-amber-500", variant: "secondary" as const },
};

export function RunHistoryList({ runs }: RunHistoryListProps) {
  if (runs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <History className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No runs yet</h3>
          <p className="text-muted-foreground text-center mt-2">
            Run history will appear here once the automation runs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Run History</CardTitle>
        <CardDescription>
          Recent automation runs and their results
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-center">Searched</TableHead>
              <TableHead className="text-center">New</TableHead>
              <TableHead className="text-center">Processed</TableHead>
              <TableHead className="text-center">Matched</TableHead>
              <TableHead className="text-center">Saved</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => {
              const config = STATUS_CONFIG[run.status] || STATUS_CONFIG.failed;
              const StatusIcon = config.icon;
              const duration = run.completedAt
                ? Math.round(
                    (new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000
                  )
                : null;

              return (
                <TableRow key={run.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${config.color}`} />
                      <Badge variant={config.variant}>{run.status.replace("_", " ")}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(run.startedAt), "MMM d, h:mm a")}
                  </TableCell>
                  <TableCell>
                    {duration !== null ? `${duration}s` : "-"}
                  </TableCell>
                  <TableCell className="text-center">{run.jobsSearched}</TableCell>
                  <TableCell className="text-center">{run.jobsDeduplicated}</TableCell>
                  <TableCell className="text-center">{run.jobsProcessed}</TableCell>
                  <TableCell className="text-center">{run.jobsMatched}</TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">{run.jobsSaved}</span>
                  </TableCell>
                  <TableCell>
                    {(run.errorMessage || run.blockedReason) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="max-w-[150px] truncate">
                              {run.blockedReason || run.errorMessage}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              {run.blockedReason || run.errorMessage}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
