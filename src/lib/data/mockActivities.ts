import { Activity } from "@/models/activity.model";

export const MOCK_DATA_IDENTIFIER = "[MOCK_DATA]";

export interface MockActivityData extends Activity {
  activityTypeId?: string;
}

export const mockActivityTypes = [
  {
    id: "mock-learning",
    label: "Learning",
    value: "Learning",
  },
  {
    id: "mock-side-project-1",
    label: "Side Project 1",
    value: "Side Project 1",
  },
  {
    id: "mock-side-project-2",
    label: "Side Project 2",
    value: "Side Project 2",
  },
  {
    id: "mock-job-search",
    label: "Job Search",
    value: "Job Search",
  },
  {
    id: "mock-interview-prep",
    label: "Interview Preparation",
    value: "Interview Preparation",
  },
];
