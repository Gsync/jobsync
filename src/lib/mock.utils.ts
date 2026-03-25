import {
  Company,
  JobLocation,
  JobTitle,
  JobResponse,
} from "@/models/job.model";
import { Activity } from "@/models/activity.model";
import type { Task } from "@/models/task.model";
import type { Question } from "@/models/question.model";
import { MY_JOBS_DATA } from "./data/myJobsData";
import { addDays, format, subDays } from "date-fns";

export function getMockJobsList(
  page: number,
  jobsPerPage: number,
  filter?: string,
): Promise<{ data: JobResponse[]; total: number }> {
  return new Promise((resolve) => {
    // Filter data by status
    const filteredData = filter
      ? MY_JOBS_DATA.data.filter((job) => job.Status.value === filter)
      : MY_JOBS_DATA.data;

    // Calculate start and end index for pagination
    const startIndex = (page - 1) * jobsPerPage;
    const endIndex = startIndex + jobsPerPage;

    // Slice the data for the current page
    const paginatedData = filteredData.slice(startIndex, endIndex);

    resolve({ data: paginatedData, total: paginatedData.length });
  });
}

export function getMockJobDetails(id: string): Promise<any> {
  return new Promise((resolve) => {
    // Find the job with the given id
    const job = MY_JOBS_DATA.data.find((job) => job.id === id);

    resolve(job);
  });
}

/**
 * Generates a random integer between the specified min and max values (inclusive).
 *
 * @param min - The minimum value.
 * @param max - The maximum value.
 * @returns A random integer between min and max.
 */
export const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Generates an array of objects, each with a 'day' in 'yyyy-MM-dd' format and a 'value'
 * that is a random number between 1 and 20. Randomly skips days based on the given probability.
 *
 * @param daysAgo - The number of day ago to start with.
 * @param skipProbability - The probability of skipping a day (default is 0.3).
 * @param formatType - Formats the date type (default is "yyyy-MM-dd")
 * @returns An array of objects with 'day' and 'value' properties.
 *
 * @example
 * // Example usage:
 * const daysAgo = 30 // for 30 days from current date
 * const randomDateValues = generateRandomDateValues(daysAgo);
 * console.log(randomDateValues);
 * FormatType: "yyyy-MM-dd" = "2024-06-23", "PP" = "Jun 23, 2024"
 */
export const getMockJobActivityData = (
  daysAgo: number,
  skipProbability: number = 0.3,
  formatType: string = "yyyy-MM-dd",
): Promise<{ day: string; value: number }[]> => {
  return new Promise((resolve) => {
    const result: { day: string; value: number }[] = [];
    const endDate = new Date();
    const startDate = subDays(new Date(), daysAgo);
    let currentDate = startDate;

    while (currentDate <= endDate) {
      // Randomly decide whether to include the current date
      if (Math.random() > skipProbability) {
        const formattedDate = format(currentDate, formatType);
        const randomValue = getRandomInt(1, 20);
        result.push({ day: formattedDate, value: randomValue });
      }
      currentDate = addDays(currentDate, 1);
    }

    resolve(result);
  });
};

export const getMockRecentJobs = (): Promise<JobResponse[]> => {
  return new Promise((resolve) => {
    const data = MY_JOBS_DATA.data.slice(0, 6);
    resolve(data);
  });
};

export function getMockList(
  page = 1,
  recordsPerPage = 10,
  type: "companies" | "jobTitles" | "locations",
): Promise<{ data: any[]; total: number }> {
  return new Promise((resolve) => {
    const result: { [key: string]: any } = {};

    MY_JOBS_DATA.data.forEach((job) => {
      let key: string,
        label: string,
        value: string,
        createdBy: string,
        logoUrl: string | undefined;

      if (type === "companies") {
        key = job.Company.id;
        label = job.Company.label;
        value = job.Company.value;
        createdBy = job.Company.createdBy;
        logoUrl = job.Company.logoUrl;
      } else if (type === "jobTitles") {
        key = job.JobTitle.id;
        label = job.JobTitle.label;
        value = job.JobTitle.value;
        createdBy = job.Company.createdBy;
      } else if (type === "locations") {
        key = job.Location.id;
        label = job.Location.label;
        value = job.Location.value;
        createdBy = job.Company.createdBy;
      } else {
        return;
      }

      if (!result[key]) {
        result[key] = {
          id: key,
          label,
          value,
          createdBy,
          logoUrl,
          _count: type === "jobTitles" ? { jobs: 0 } : { jobsApplied: 0 },
        };
      }

      if (job.applied) {
        if (type === "jobTitles") {
          result[key]._count!.jobs += 1;
        } else {
          result[key]._count!.jobsApplied += 1;
        }
      }
    });
    const data = Object.values(result);

    resolve({ data, total: data.length });
  });
}

const MOCK_ACTIVITY_TYPES = [
  "Learning",
  "Side Project 1",
  "Side Project 2",
  "Job Search",
  "Interview Preparation",
  "Networking",
  "Coding",
];

const MOCK_ACTIVITY_TITLES: { [key: string]: string[] } = {
  Learning: [
    "TypeScript Advanced Concepts",
    "React Hooks Deep Dive",
    "Next.js Performance",
    "Web Security Fundamentals",
    "Database Optimization",
  ],
  "Side Project 1": [
    "Build Portfolio Website",
    "Implement New Features",
    "Code Refactoring",
    "Add Testing Coverage",
    "Improve Documentation",
  ],
  "Side Project 2": [
    "Mobile App Development",
    "API Integration",
    "UI/UX Improvements",
    "Database Migration",
    "Deployment Setup",
  ],
  "Job Search": [
    "Research Companies",
    "Apply to Jobs",
    "Update Resume",
    "Network on LinkedIn",
    "Review Job Listings",
  ],
  "Interview Preparation": [
    "Practice Coding Challenges",
    "System Design Review",
    "Mock Interview",
    "Behavioral Interview Prep",
    "Technical Questions Study",
  ],
  "Networking": [
    "Attend Local Tech Meetup",
    "LinkedIn Outreach",
    "Coffee Chat with Recruiter",
    "Conference Talk Prep",
    "Open Source Contribution",
  ],
  "Coding": [
    "LeetCode Practice",
    "HackerRank Challenge",
    "Build CLI Tool",
    "Refactor Personal Project",
    "Write Technical Blog Post",
  ],
};

/**
 * Generates mock activities for the last N days
 * @param userId - User ID for the activities
 * @param daysBack - Number of days back to generate activities (default: 10)
 * @param totalRecords - Minimum total records to generate (default: 25)
 * @returns Array of mock activities
 */
export const generateMockActivities = (
  userId: string,
  daysBack: number = 10,
  totalRecords: number = 25,
): Activity[] => {
  const activities: Activity[] = [];
  const endDate = new Date();
  const startDate = subDays(endDate, daysBack);
  let recordsGenerated = 0;

  for (let i = 0; i < daysBack && recordsGenerated < totalRecords; i++) {
    const currentDate = addDays(startDate, i);
    const recordsPerDay = Math.ceil(
      (totalRecords - recordsGenerated) / (daysBack - i),
    );

    for (let j = 0; j < recordsPerDay && recordsGenerated < totalRecords; j++) {
      const activityType =
        MOCK_ACTIVITY_TYPES[getRandomInt(0, MOCK_ACTIVITY_TYPES.length - 1)];
      const titles = MOCK_ACTIVITY_TITLES[activityType];
      const activityName = titles[getRandomInt(0, titles.length - 1)];
      const duration = getRandomInt(20, 120);

      const startTime = new Date(currentDate);
      startTime.setHours(getRandomInt(6, 22));
      startTime.setMinutes(getRandomInt(0, 59));

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + duration);

      activities.push({
        activityName,
        activityType,
        startTime,
        endTime,
        duration,
        description: `[MOCK_DATA] ${activityName}`,
        userId,
      });

      recordsGenerated++;
    }
  }

  return activities;
};

// ═══════════════════════════════════════════════════════════════════════════
// Additional Mock Data Generators
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_TASK_TITLES = [
  "Prepare for system design interview",
  "Update resume with latest projects",
  "Complete take-home coding challenge",
  "Follow up with recruiter",
  "Research company culture and values",
  "Practice behavioral interview questions",
  "Review job description requirements",
  "Set up portfolio website",
  "Attend networking event",
  "Write thank-you email after interview",
  "Learn new framework for upcoming role",
  "Review pull request feedback",
];

const MOCK_TASK_STATUSES: Array<"in-progress" | "complete" | "needs-attention" | "cancelled"> = [
  "in-progress",
  "complete",
  "needs-attention",
  "cancelled",
];

/**
 * Generates a set of mock tasks with varying priorities, statuses, and completion percentages.
 * @param userId - The user ID to associate tasks with.
 * @param count - Number of tasks to generate (default: 8).
 * @returns Array of mock Task objects.
 */
export const generateMockTasks = (
  userId: string,
  count: number = 8,
): Task[] => {
  const tasks: Task[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const status = MOCK_TASK_STATUSES[getRandomInt(0, MOCK_TASK_STATUSES.length - 1)];
    const percentComplete =
      status === "complete"
        ? 100
        : status === "cancelled"
          ? getRandomInt(0, 50)
          : getRandomInt(5, 95);
    const priority = getRandomInt(0, 3);
    const createdDaysAgo = getRandomInt(1, 30);
    const createdAt = subDays(now, createdDaysAgo);
    const hasDueDate = Math.random() > 0.2;

    tasks.push({
      id: `mock-task-${i}`,
      userId,
      title: MOCK_TASK_TITLES[i % MOCK_TASK_TITLES.length],
      description:
        Math.random() > 0.3
          ? `[MOCK_DATA] ${MOCK_TASK_TITLES[i % MOCK_TASK_TITLES.length]}`
          : null,
      status,
      priority,
      percentComplete,
      dueDate: hasDueDate ? addDays(now, getRandomInt(-5, 20)) : null,
      activityTypeId: null,
      createdAt,
      updatedAt: addDays(createdAt, getRandomInt(0, createdDaysAgo)),
    });
  }

  return tasks;
};

const MOCK_QUESTION_TEXTS = [
  { q: "What is the difference between REST and GraphQL?", tags: ["system design"] },
  { q: "Explain the event loop in Node.js.", tags: ["javascript"] },
  { q: "How does React's reconciliation algorithm work?", tags: ["react"] },
  { q: "Describe SOLID principles with examples.", tags: ["system design"] },
  { q: "What are the trade-offs of microservices vs monolith?", tags: ["system design"] },
  { q: "Tell me about a time you had to learn something quickly.", tags: [] },
  { q: "How do you handle disagreements with teammates?", tags: [] },
  { q: "Explain the CAP theorem.", tags: ["system design"] },
  { q: "What is a closure in JavaScript?", tags: ["javascript"] },
  { q: "How would you optimize a slow database query?", tags: ["system design", "python"] },
];

/**
 * Generates a set of mock interview/study questions with varying tag combinations and answer lengths.
 * @param userId - The user ID who created the questions.
 * @param count - Number of questions to generate (default: 8).
 * @returns Array of mock Question objects.
 */
export const generateMockQuestions = (
  userId: string,
  count: number = 8,
): Question[] => {
  const questions: Question[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const template = MOCK_QUESTION_TEXTS[i % MOCK_QUESTION_TEXTS.length];
    const hasAnswer = Math.random() > 0.25;
    const createdDaysAgo = getRandomInt(5, 60);
    const createdAt = subDays(now, createdDaysAgo);

    questions.push({
      id: `mock-question-${i}`,
      question: template.q,
      answer: hasAnswer
        ? `[MOCK_DATA] This is a sample answer for: "${template.q}". ` +
          "The answer covers key concepts, trade-offs, and practical examples."
        : null,
      createdBy: userId,
      tags: template.tags.map((t, idx) => ({
        id: `mock-tag-${t.replace(/\s/g, "-")}-${idx}`,
        label: t.charAt(0).toUpperCase() + t.slice(1),
        value: t,
        createdBy: userId,
      })),
      createdAt,
      updatedAt: hasAnswer
        ? addDays(createdAt, getRandomInt(1, createdDaysAgo))
        : createdAt,
    });
  }

  return questions;
};
