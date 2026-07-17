"use server";

import prisma from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";
import { handleError } from "@/lib/utils";
import { SectionType } from "@/models/profile.model";
import {
  resolveCompany,
  resolveJobTitle,
  resolveLocation,
  resolveTag,
} from "@/lib/jobs/resolve";
import { APP_CONSTANTS } from "@/lib/constants";
import {
  ImportContactInfo,
  ImportExperience,
  ImportEducation,
  ImportCertification,
  ImportSkills,
} from "@/models/resumeImport.schema";

// TYPES

export type ImportCardPayload =
  | { type: "contactInfo"; data: ImportContactInfo }
  | { type: "summary"; data: string }
  | { type: "experience"; data: ImportExperience }
  | { type: "education"; data: ImportEducation }
  | { type: "certification"; data: ImportCertification }
  | { type: "skills"; data: ImportSkills };

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

// Find-or-create a ResumeSection by type — shared by experience, education,
// and certification, which (unlike summary) don't need to branch on whether
// a nested child record already exists.
async function getOrCreateResumeSection(
  resumeId: string,
  sectionType: SectionType,
  sectionTitle: string,
): Promise<{ id: string }> {
  const existing = await prisma.resumeSection.findFirst({
    where: { resumeId, sectionType },
    select: { id: true },
  });
  if (existing) return existing;
  return prisma.resumeSection.create({
    data: { resumeId, sectionTitle, sectionType },
    select: { id: true },
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

        // Location is required by schema — use a placeholder if none provided
        const [company, jobTitle, location] = await Promise.all([
          resolveCompany(d.company, user.id),
          resolveJobTitle(d.jobTitle, user.id),
          resolveLocation(d.location?.trim() || "Not specified", user.id),
        ]);

        const startDate = parseImportDate(d.startDate) ?? new Date(2000, 0, 1);
        const endDate = parseImportDate(d.endDate);

        const section = await getOrCreateResumeSection(
          resumeId,
          SectionType.EXPERIENCE,
          "Experience",
        );

        await prisma.resumeSection.update({
          where: { id: section.id, Resume: { profile: { userId: user.id } } },
          data: {
            workExperiences: {
              create: {
                companyId: company.id,
                jobTitleId: jobTitle.id,
                locationId: location.id,
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

        const location = await resolveLocation(d.location?.trim() || "Not specified", user.id);

        const startDate = parseImportDate(d.startDate) ?? new Date(2000, 0, 1);
        const endDate = parseImportDate(d.endDate);

        const section = await getOrCreateResumeSection(
          resumeId,
          SectionType.EDUCATION,
          "Education",
        );

        await prisma.resumeSection.update({
          where: { id: section.id, Resume: { profile: { userId: user.id } } },
          data: {
            educations: {
              create: {
                institution: d.institution,
                degree: d.degree ?? "",
                fieldOfStudy: d.fieldOfStudy ?? "",
                locationId: location.id,
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

        const section = await getOrCreateResumeSection(
          resumeId,
          SectionType.CERTIFICATION,
          "Certifications",
        );

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

      case "skills": {
        // Drop empty categories/skills and enforce the same caps as the
        // manual skills form before resolving names to shared tags.
        const categories = (card.data.categories ?? [])
          .map((cat) => ({
            label: cat.label?.trim() || null,
            skills: (cat.skills ?? [])
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, APP_CONSTANTS.MAX_SKILLS_PER_CATEGORY),
          }))
          .filter((cat) => cat.skills.length > 0)
          .slice(0, APP_CONSTANTS.MAX_SKILL_CATEGORIES);

        if (categories.length === 0) {
          throw new Error("No skills to import");
        }

        const section = await prisma.resumeSection.create({
          data: {
            resumeId,
            sectionTitle: "Skills",
            sectionType: SectionType.SKILLS,
          },
        });

        let order = 0;
        const skillRows: {
          tagId: string;
          category: string | null;
          order: number;
          resumeSectionId: string;
        }[] = [];
        for (const cat of categories) {
          for (const name of cat.skills) {
            const tag = await resolveTag(name, user.id);
            skillRows.push({
              tagId: tag.id,
              category: cat.label,
              order: order++,
              resumeSectionId: section.id,
            });
          }
        }

        await prisma.skill.createMany({ data: skillRows });
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
