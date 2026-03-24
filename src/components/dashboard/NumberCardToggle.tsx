"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "@/i18n";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberCardToggleProps {
  data: {
    label: string;
    num: number;
    trend: number;
  }[];
}

// Map English period labels from server to i18n keys
const periodLabelKeys: Record<string, string> = {
  "Last 7 days": "dashboard.period7Days",
  "Last 30 days": "dashboard.period30Days",
};

export default function NumberCardToggle({ data }: NumberCardToggleProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const current = data[activeIndex];
  const { t } = useTranslations();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-end">
          <div className="flex rounded-md border text-xs">
            {data.map((item, index) => (
              <button
                key={item.label}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "px-2 py-1 transition-colors",
                  index === 0 && "rounded-l-md",
                  index === data.length - 1 && "rounded-r-md",
                  activeIndex === index
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {periodLabelKeys[item.label] ? t(periodLabelKeys[item.label]) : item.label}
              </button>
            ))}
          </div>
        </div>
        <CardTitle className="text-4xl">
          {current.num}{" "}
          <span className="text-xs text-muted-foreground">{t("dashboard.jobsApplied")}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 text-xs text-muted-foreground">
          {current.trend}%{" "}
          {current.trend > 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Progress
          value={current.trend}
          aria-label={`${current.trend}% ${current.trend >= 0 ? "increase" : "decrease"}`}
        />
      </CardFooter>
    </Card>
  );
}
