"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  Loader2,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import type { AutomationLog, LogLevel } from "@/lib/automation-logger";

interface LogsTabProps {
  automationId: string;
  runKey?: number;
}

interface LogData {
  logs: AutomationLog[];
  isRunning: boolean;
  startedAt?: string;
  completedAt?: string;
}

export function LogsTab({ automationId, runKey }: LogsTabProps) {
  const [logData, setLogData] = useState<LogData>({
    logs: [],
    isRunning: false,
  });
  const [filter, setFilter] = useState<LogLevel | "all">("all");

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/automations/${automationId}/logs`,
    );

    eventSource.onmessage = (event) => {
      try {
        const data: LogData = JSON.parse(event.data);
        setLogData(data);
      } catch (err) {
        console.error("Failed to parse log data:", err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [automationId]);

  useEffect(() => {
    if (runKey !== undefined) {
      setLogData({ logs: [], isRunning: true });
    }
  }, [runKey]);

  const handleClearLogs = async () => {
    try {
      await fetch(`/api/automations/${automationId}/logs/clear`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to clear server logs:", err);
    }
    setLogData({ logs: [], isRunning: false });
  };

  const filteredLogs =
    filter === "all"
      ? logData.logs
      : logData.logs.filter((log) => log.level === filter);

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case "info":
        return "text-blue-600";
      case "success":
        return "text-green-600";
      case "warning":
        return "text-amber-600";
      case "error":
        return "text-red-600";
    }
  };

  const getLevelBadgeVariant = (level: LogLevel) => {
    switch (level) {
      case "info":
        return "default" as const;
      case "success":
        return "default" as const;
      case "warning":
        return "secondary" as const;
      case "error":
        return "destructive" as const;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Automation Logs</CardTitle>
            {logData.isRunning && (
              <Badge variant="default" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Running
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filter === "info" ? "default" : "outline"}
                onClick={() => setFilter("info")}
              >
                Info
              </Button>
              <Button
                size="sm"
                variant={filter === "success" ? "default" : "outline"}
                onClick={() => setFilter("success")}
              >
                Success
              </Button>
              <Button
                size="sm"
                variant={filter === "warning" ? "default" : "outline"}
                onClick={() => setFilter("warning")}
              >
                Warning
              </Button>
              <Button
                size="sm"
                variant={filter === "error" ? "default" : "outline"}
                onClick={() => setFilter("error")}
              >
                Error
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearLogs}
              disabled={logData.logs.length === 0}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {logData.startedAt && (
          <p className="text-sm text-muted-foreground">
            Started: {format(new Date(logData.startedAt), "MMM d, h:mm:ss a")}
            {logData.completedAt && (
              <>
                {" "}
                • Completed:{" "}
                {format(new Date(logData.completedAt), "MMM d, h:mm:ss a")}
              </>
            )}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full">
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>
                {logData.logs.length === 0
                  ? "No logs yet. Run the automation to see logs."
                  : "No logs match the selected filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-2 font-mono text-xs">
              {[...filteredLogs].reverse().map((log, index) => (
                <div
                  key={index}
                  className="flex gap-2 p-2 rounded border hover:bg-muted/50"
                >
                  <div className="flex-shrink-0 pt-0.5">
                    {getLevelIcon(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-muted-foreground">
                        {format(new Date(log.timestamp), "HH:mm:ss.SSS")}
                      </span>
                      <Badge
                        variant={getLevelBadgeVariant(log.level)}
                        className="text-xs"
                      >
                        {log.level}
                      </Badge>
                    </div>
                    <div className={getLevelColor(log.level)}>
                      {log.message}
                    </div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
