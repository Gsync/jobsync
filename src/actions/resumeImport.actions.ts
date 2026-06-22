"use server";

import prisma from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";
import { handleError } from "@/lib/utils";
import { SectionType } from "@/models/profile.model";
import { createJobTitle } from "@/actions/jobtitle.actions";
import { createLocation } from "@/actions/job.actions";
import {
  ImportContactInfo,
  ImportExperience,
  ImportEducation,
  ImportCertification,
} from "@/models/resumeImport.schema";

// TYPES

export type ImportCardPayload =
  | { type: "contactInfo"; data: ImportContactInfo }
  | { type: "summary"; data: string }
  | { type: "experience"; data: ImportExperience }
  | { type: "education"; data: ImportEducation }
  | { type: "certification"; data: ImportCertification };

export type ResolveResult =
  | { success: true; status: "saved" }
  | { success: false; message: string };

// DATE PARSING

function parseImportDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const t = s.trim().toLowerCase();
  if (["present", "current", "now", "ongoing", "-"].includes(t)) return null;

  // "Jan 2020" / "January 2020"
  const monthYear = /^([a-z]+)\s+(\d{4})$/i.exec(s.trim());
  if (monthYear) {
    const d = new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
    if (!isNaN(d.getTime())) return d;
  }

  // "2020"
  if (/^\d{4}$/.test(s.trim())) {
    return new Date(parseInt(s.trim()), 0, 1);
  }

  // MM/YYYY or MM-YYYY
  const mmyyyy = /^(\d{1,2})[/-](\d{4})$/.exec(s.trim());
  if (mmyyyy) {
    return new Date(parseInt(mmyyyy[2]), parseInt(mmyyyy[1]) - 1, 1);
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Wrap plain text in TipTap-compatible <p> paragraphs with HTML escaping
function wrapAsHtml(text: string | undefined): string {
  if (!text?.trim()) return "<p></p>";
  return text
    .split(/\n+/)
    .map((line) => `<p>${escapeHtml(line.trim())}</p>`)
    .join("");
}

// Upsert a company scoped to the current user
async function upsertCompany(label: string, userId: string) {
  const value = label.trim().toLowerCase();
  const existing = await prisma.company.findFirst({
    where: { value, createdBy: userId },
  });
  if (existing) return existing;
  return prisma.company.create({
    data: { label: label.trim(), value, createdBy: userId },
  });
}

// MAIN ACTION

export async function resolveImportCard(
  resumeId: string,
  card: ImportCardPayload,
): Promise<ResolveResult> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    // Verify resume ownership
    const owned = await prisma.resume.findUnique({
      where: { id: resumeId, profile: { userId: user.id } },
      select: { id: true },
    });
    if (!owned) throw new Error("Resume not found or access denied");

    switch (card.type) {
      case "contactInfo": {
        const d = card.data;
        await prisma.resume.update({
          where: { id: resumeId, profile: { userId: user.id } },
          data: {
            ContactInfo: {
              connectOrCreate: {
                where: { resumeId },
                create: {
                  firstName: d.firstName ?? "",
                  lastName: d.lastName ?? "",
                  headline: d.headline ?? "",
                  email: d.email ?? "",
                  phone: d.phone ?? "",
                  address: d.address,
                },
              },
            },
          },
        });
        break;
      }

      case "summary": {
        // Look for existing summary section
        const existingSection = await prisma.resumeSection.findFirst({
          where: { resumeId, sectionType: SectionType.SUMMARY },
          select: { id: true, summaryId: true },
        });

        if (existingSection) {
          // Update existing
          if (existingSection.summaryId) {
            await prisma.summary.update({
              where: { id: existingSection.summaryId },
              data: { content: wrapAsHtml(card.data) },
            });
          }
        } else {
          // Create new section + summary
          const section = await prisma.resumeSection.create({
            data: {
              resumeId,
              sectionTitle: "Summary",
              sectionType: SectionType.SUMMARY,
            },
          });
          await prisma.resumeSection.update({
            where: { id: section.id },
            data: {
              summary: { create: { content: wrapAsHtml(card.data) } },
            },
          });
        }
        break;
      }

      case "experience": {
        const d = card.data;

        const [company, jobTitleResult, locationResult] = await Promise.all([
          upsertCompany(d.company, user.id),
          createJobTitle(d.jobTitle),
          d.location ? createLocation(d.location) : Promise.resolve(null),
        ]);

        if (!company?.id) throw new Error("Failed to resolve company");
        if (!jobTitleResult?.id) throw new Error("Failed to resolve job title");

        // Location is required by schema — use a placeholder if none provided
        let locationId: string;
        if (locationResult && "data" in locationResult && locationResult.data?.id) {
          locationId = locationResult.data.id;
        } else if (locationResult && "id" in locationResult && locationResult.id) {
          locationId = (locationResult as any).id;
        } else {
          const fallback = await createLocation(d.location || "Not specified");
          locationId = (fallback as any)?.data?.id ?? (fallback as any)?.id;
          if (!locationId) throw new Error("Failed to resolve location");
        }

        const startDate = parseImportDate(d.startDate) ?? new Date(2000, 0, 1);
        const endDate = parseImportDate(d.endDate);

        // Find or create the experience section
        let section = await prisma.resumeSection.findFirst({
          where: { resumeId, sectionType: SectionType.EXPERIENCE },
          select: { id: true },
        });
        if (!section) {
          section = await prisma.resumeSection.create({
            data: { resumeId, sectionTitle: "Experience", sectionType: SectionType.EXPERIENCE },
          });
        }

        await prisma.resumeSection.update({
          where: { id: section.id, Resume: { profile: { userId: user.id } } },
          data: {
            workExperiences: {
              create: {
                companyId: company.id,
                jobTitleId: jobTitleResult.id,
                locationId,
                startDate,
                endDate: endDate ?? undefined,
                description: wrapAsHtml(d.description),
              },
            },
          },
        });
        break;
      }

      case "education": {
        const d = card.data;

        let locationId: string | undefined;
        if (d.location) {
          const locResult = await createLocation(d.location);
          locationId =
            (locResult as any)?.data?.id ?? (locResult as any)?.id;
        }
        if (!locationId) {
          const fallback = await createLocation("Not specified");
          locationId = (fallback as any)?.data?.id ?? (fallback as any)?.id;
        }
        if (!locationId) throw new Error("Failed to resolve location");

        const startDate = parseImportDate(d.startDate) ?? new Date(2000, 0, 1);
        const endDate = parseImportDate(d.endDate);

        let section = await prisma.resumeSection.findFirst({
          where: { resumeId, sectionType: SectionType.EDUCATION },
          select: { id: true },
        });
        if (!section) {
          section = await prisma.resumeSection.create({
            data: { resumeId, sectionTitle: "Education", sectionType: SectionType.EDUCATION },
          });
        }

        await prisma.resumeSection.update({
          where: { id: section.id, Resume: { profile: { userId: user.id } } },
          data: {
            educations: {
              create: {
                institution: d.institution,
                degree: d.degree ?? "",
                fieldOfStudy: d.fieldOfStudy ?? "",
                locationId,
                startDate,
                endDate: endDate ?? undefined,
                description: wrapAsHtml(d.description),
              },
            },
          },
        });
        break;
      }

      case "certification": {
        const d = card.data;

        let section = await prisma.resumeSection.findFirst({
          where: { resumeId, sectionType: SectionType.CERTIFICATION },
          select: { id: true },
        });
        if (!section) {
          section = await prisma.resumeSection.create({
            data: {
              resumeId,
              sectionTitle: "Certifications",
              sectionType: SectionType.CERTIFICATION,
            },
          });
        }

        await prisma.resumeSection.update({
          where: { id: section.id, Resume: { profile: { userId: user.id } } },
          data: {
            licenseOrCertifications: {
              create: {
                title: d.title,
                organization: d.organization ?? "",
                issueDate: parseImportDate(d.issueDate) ?? undefined,
                expirationDate: parseImportDate(d.expirationDate) ?? undefined,
                credentialUrl: d.credentialUrl,
              },
            },
          },
        });
        break;
      }
    }

    return { success: true, status: "saved" };
  } catch (error) {
    const msg = "Failed to save imported section.";
    const result = handleError(error, msg);
    return { success: false, message: result?.message ?? msg };
  }
}
