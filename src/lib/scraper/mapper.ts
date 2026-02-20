import type { DiscoveryStatus } from "@/models/automation.model";
import type { DiscoveredVacancy } from "./types";
import db from "@/lib/db";
import { normalizeForSearch, extractKeywords, extractCityName } from "./utils";

interface MapperInput {
  vacancy: DiscoveredVacancy;
  userId: string;
  automationId: string;
  matchScore: number;
  matchData: string;
}

interface MapperOutput {
  userId: string;
  automationId: string;
  jobUrl: string;
  description: string;
  jobType: string;
  createdAt: Date;
  applied: boolean;
  statusId: string;
  jobTitleId: string;
  companyId: string;
  jobSourceId: string;
  locationId: string | null;
  matchScore: number;
  matchData: string;
  discoveryStatus: DiscoveryStatus;
  discoveredAt: Date;
}

export async function mapScrapedJobToJobRecord(
  input: MapperInput
): Promise<MapperOutput> {
  const { vacancy, userId, automationId, matchScore, matchData } = input;

  const jobTitleId = await findOrCreateJobTitle(vacancy.title, userId);
  const locationId = await findOrCreateLocation(vacancy.location, userId);
  const companyId = await findOrCreateCompany(vacancy.employerName, userId);
  const jobSourceId = await getOrCreateJobSource(vacancy.sourceBoard);
  const statusId = await getDefaultJobStatus();

  return {
    userId,
    automationId,
    jobUrl: vacancy.sourceUrl,
    description: vacancy.description,
    jobType: "full-time",
    createdAt: new Date(),
    applied: false,
    statusId,
    jobTitleId,
    companyId,
    jobSourceId,
    locationId,
    matchScore,
    matchData,
    discoveryStatus: "new",
    discoveredAt: new Date(),
  };
}

async function findOrCreateJobTitle(
  title: string,
  userId: string
): Promise<string> {
  const normalized = normalizeForSearch(title);

  let existing = await db.jobTitle.findFirst({
    where: { value: normalized, createdBy: userId },
  });

  if (!existing) {
    const keywords = extractKeywords(title);
    if (keywords.length > 0) {
      existing = await db.jobTitle.findFirst({
        where: {
          createdBy: userId,
          OR: keywords.map((keyword) => ({
            value: { contains: keyword },
          })),
        },
      });
    }
  }

  if (existing) {
    return existing.id;
  }

  const newTitle = await db.jobTitle.create({
    data: {
      label: title,
      value: normalized,
      createdBy: userId,
    },
  });
  return newTitle.id;
}

async function findOrCreateLocation(
  location: string,
  userId: string
): Promise<string | null> {
  if (!location) return null;

  const normalized = normalizeForSearch(location);
  const cityName = extractCityName(location);

  let existing = await db.location.findFirst({
    where: {
      value: normalized,
      createdBy: userId,
    },
  });

  if (!existing && cityName) {
    existing = await db.location.findFirst({
      where: {
        createdBy: userId,
        OR: [
          { value: { contains: cityName } },
          { label: { contains: cityName } },
        ],
      },
    });
  }

  if (existing) {
    return existing.id;
  }

  const newLocation = await db.location.create({
    data: {
      label: location,
      value: normalized,
      createdBy: userId,
    },
  });
  return newLocation.id;
}

async function findOrCreateCompany(
  company: string,
  userId: string
): Promise<string> {
  const normalized = normalizeForSearch(company);

  let existing = await db.company.findFirst({
    where: { value: normalized, createdBy: userId },
  });

  if (!existing) {
    const companyKeywords = extractKeywords(company);
    if (companyKeywords.length > 0) {
      existing = await db.company.findFirst({
        where: {
          createdBy: userId,
          OR: companyKeywords.map((keyword) => ({
            label: { contains: keyword },
          })),
        },
      });
    }
  }

  if (existing) {
    return existing.id;
  }

  const newCompany = await db.company.create({
    data: {
      label: company,
      value: normalized,
      createdBy: userId,
    },
  });
  return newCompany.id;
}

async function getOrCreateJobSource(
  sourceBoard: string
): Promise<string> {
  const normalized = sourceBoard.toLowerCase();

  let jobSource = await db.jobSource.findFirst({
    where: { value: normalized },
  });

  if (!jobSource) {
    jobSource = await db.jobSource.create({
      data: {
        label: sourceBoard.charAt(0).toUpperCase() + sourceBoard.slice(1),
        value: normalized,
      },
    });
  }

  return jobSource.id;
}

async function getDefaultJobStatus(): Promise<string> {
  let status = await db.jobStatus.findFirst({ where: { value: "new" } });

  if (!status) {
    status = await db.jobStatus.create({
      data: { label: "New", value: "new" },
    });
  }

  return status.id;
}
