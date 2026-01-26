import {
  Company,
  JobLocation,
  JobTitle,
  JobResponse,
} from "@/models/job.model";
import { Activity } from "@/models/activity.model";
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
