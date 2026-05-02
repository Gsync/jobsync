"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TopActivityType } from "@/actions/dashboard.actions";

interface TopActivitiesCardProps {
  data: {
    label: string;
    activities: TopActivityType[];
  }[];
}

export default function TopActivitiesCard({ data }: TopActivitiesCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const current = data[activeIndex];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-green-600">
            Activities
          </CardTitle>
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
                {item.label.replace("Last ", "")}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {current.activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No activities recorded
          </p>
        ) : (
          <div className="space-y-3">
            {current.activities.map((activity, index) => (
              <div key={activity.label} className="flex items-center gap-3 min-w-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {activity.label}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums xl:hidden">
                    {activity.hours}h
                  </p>
                </div>
                <span className="hidden xl:block text-sm font-semibold tabular-nums shrink-0">
                  {activity.hours}h
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
