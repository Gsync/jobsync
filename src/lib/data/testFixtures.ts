/**
 * Reusable test fixtures for unit tests.
 * Import what you need: import { mockUser, mockJob } from "@/lib/data/testFixtures"
 */

import type { CurrentUser } from "@/models/user.model";
import type { JobResponse, Company, JobTitle, JobStatus, JobLocation, JobSource } from "@/models/job.model";
import type { Activity, ActivityType } from "@/models/activity.model";
import type { Task } from "@/models/task.model";
import type { Resume } from "@/models/profile.model";
import type { Automation } from "@/models/automation.model";

// ─── User ──────────────────────────────────────────────────────────────────

export const mockUser: CurrentUser = {
  id: "test-user-id",
  name: "Test User",
  email: "test.user@example.com",
};

// ─── Company ───────────────────────────────────────────────────────────────

export const mockCompany: Company = {
  id: "company-fixture-id",
  label: "Acme Corp",
  value: "acme corp",
  createdBy: mockUser.id,
  logoUrl: "https://example.com/acme-logo.png",
  _count: { jobsApplied: 3 },
};

// ─── Job Title ─────────────────────────────────────────────────────────────

export const mockJobTitle: JobTitle = {
  id: "job-title-fixture-id",
  label: "Software Engineer",
  value: "software engineer",
  createdBy: mockUser.id,
  _count: { jobs: 5 },
};

// ─── Job Status ────────────────────────────────────────────────────────────

export const mockJobStatus: JobStatus = {
  id: "status-fixture-id",
  label: "Applied",
  value: "applied",
};

// ─── Job Location ──────────────────────────────────────────────────────────

export const mockJobLocation: JobLocation = {
  id: "location-fixture-id",
  label: "San Francisco, CA",
  value: "san francisco, ca",
  stateProv: "CA",
  country: "US",
  createdBy: mockUser.id,
};

// ─── Job Source ────────────────────────────────────────────────────────────

export const mockJobSource: JobSource = {
  id: "source-fixture-id",
  label: "LinkedIn",
  value: "linkedin",
  createdBy: mockUser.id,
};

// ─── Resume ────────────────────────────────────────────────────────────────

export const mockResume: Resume = {
  id: "resume-fixture-id",
  profileId: "profile-fixture-id",
  title: "Software Engineer Resume",
  createdAt: new Date("2024-01-15T10:00:00.000Z"),
  updatedAt: new Date("2024-06-01T12:00:00.000Z"),
};

// ─── Job ───────────────────────────────────────────────────────────────────

export const mockJob: JobResponse = {
  id: "job-fixture-id",
  userId: mockUser.id,
  JobTitle: mockJobTitle,
  Company: mockCompany,
  Status: mockJobStatus,
  Location: mockJobLocation,
  JobSource: mockJobSource,
  jobType: "FT",
  createdAt: new Date("2024-06-01T09:00:00.000Z"),
  appliedDate: new Date("2024-06-02T10:00:00.000Z"),
  dueDate: new Date("2024-07-01T00:00:00.000Z"),
  salaryRange: "$90,000 - $120,000",
  description: "Build and maintain web applications using modern frameworks.",
  jobUrl: "https://example.com/jobs/software-engineer",
  applied: true,
  resumeId: mockResume.id,
  tags: [],
};

// ─── Activity Type ─────────────────────────────────────────────────────────

export const mockActivityType: ActivityType = {
  id: "activity-type-fixture-id",
  label: "Learning",
  value: "Learning",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

// ─── Activity ──────────────────────────────────────────────────────────────

export const mockActivity: Activity = {
  id: "activity-fixture-id",
  activityTypeId: mockActivityType.id,
  activityType: mockActivityType,
  userId: mockUser.id,
  activityName: "TypeScript Advanced Concepts",
  startTime: new Date("2024-06-19T09:00:00.000Z"),
  endTime: new Date("2024-06-19T10:00:00.000Z"),
  duration: 60,
  description: "[MOCK_DATA] TypeScript Advanced Concepts",
  createdAt: new Date("2024-06-19T09:00:00.000Z"),
  updatedAt: new Date("2024-06-19T10:00:00.000Z"),
};

// ─── Task ──────────────────────────────────────────────────────────────────

export const mockTask: Task = {
  id: "task-fixture-id",
  userId: mockUser.id,
  title: "Prepare for system design interview",
  description: "Review common distributed systems patterns and practice whiteboarding.",
  status: "in-progress",
  priority: 1,
  percentComplete: 40,
  dueDate: new Date("2024-07-15T00:00:00.000Z"),
  activityTypeId: mockActivityType.id,
  createdAt: new Date("2024-06-10T08:00:00.000Z"),
  updatedAt: new Date("2024-06-18T14:30:00.000Z"),
};

// ─── Automation ────────────────────────────────────────────────────────────

export const mockAutomation: Automation = {
  id: "automation-fixture-id",
  userId: mockUser.id,
  name: "Daily Software Engineer Search",
  jobBoard: "jsearch",
  keywords: "software engineer react typescript",
  location: "San Francisco, CA",
  resumeId: mockResume.id!,
  matchThreshold: 70,
  scheduleHour: 8,
  nextRunAt: new Date("2024-06-20T08:00:00.000Z"),
  lastRunAt: new Date("2024-06-19T08:00:00.000Z"),
  status: "active",
  createdAt: new Date("2024-06-01T00:00:00.000Z"),
  updatedAt: new Date("2024-06-19T08:00:00.000Z"),
};
