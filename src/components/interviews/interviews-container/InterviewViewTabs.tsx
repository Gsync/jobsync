"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { INTERVIEW_VIEWS, type InterviewView } from "@/models/interview.model";

const LABELS: Record<InterviewView, string> = {
  upcoming: "Upcoming",
  past: "Past",
  all: "All",
};

type Props = {
  view: InterviewView;
  onViewChange: (view: InterviewView) => void;
};

export function InterviewViewTabs({ view, onViewChange }: Props) {
  return (
    <Tabs value={view} onValueChange={(v) => onViewChange(v as InterviewView)}>
      <TabsList>
        {INTERVIEW_VIEWS.map((v) => (
          <TabsTrigger key={v} value={v}>
            {LABELS[v]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
