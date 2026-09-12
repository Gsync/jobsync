"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { canonicalizeEntityValue } from "@/lib/jobs/canonicalize";
import { AddCompanyFormSchema } from "@/models/addCompanyForm.schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "../shared";

const isValidImageUrl = (url: string): boolean => {
  if (!url) return true;
  if (url.startsWith("/")) return true;
  try {
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

// Absolute http(s) only — an employer URL is never a bundled asset path.
const isValidHttpUrl = (url: string): boolean => {
  if (!url) return true;
  try {
    const urlObj = new URL(url);
    return ["http:", "https:"].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

export const addCompany = async (
  data: z.infer<typeof AddCompanyFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const { company, logoUrl, websiteUrl, careersUrl, industry } = data;

    // Validate image URL
    if (logoUrl && !isValidImageUrl(logoUrl)) {
      throw new Error(
        "Invalid logo URL. Only http and https protocols are allowed.",
      );
    }

    if (websiteUrl && !isValidHttpUrl(websiteUrl)) {
      throw new Error("Website must be a full http or https URL.");
    }
    if (careersUrl && !isValidHttpUrl(careersUrl)) {
      throw new Error("Careers page must be a full http or https URL.");
    }

    const value = canonicalizeEntityValue(company.trim(), { stripLegalSuffix: true });

    const companyExists = await prisma.company.findFirst({
      where: {
        value,
        createdBy: user.id,
      },
    });

    if (companyExists) {
      throw new Error("Company already exists!");
    }

    const res = await prisma.company.create({
      data: {
        createdBy: user.id,
        value,
        label: company,
        logoUrl,
        websiteUrl,
        careersUrl,
        industry,
      },
    });
    revalidatePath("/dashboard/myjobs", "page");
    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to create company.";
    return handleError(error, msg);
  }
};

export const updateCompany = async (
  data: z.infer<typeof AddCompanyFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const { id, company, logoUrl, createdBy, websiteUrl, careersUrl, industry } =
      data;

    if (!id) {
      throw new Error("Company id is required");
    }

    // Validate image URL
    if (logoUrl && !isValidImageUrl(logoUrl)) {
      throw new Error(
        "Invalid logo URL. Only http and https protocols are allowed.",
      );
    }

    if (websiteUrl && !isValidHttpUrl(websiteUrl)) {
      throw new Error("Website must be a full http or https URL.");
    }
    if (careersUrl && !isValidHttpUrl(careersUrl)) {
      throw new Error("Careers page must be a full http or https URL.");
    }

    const existingCompany = await prisma.company.findFirst({
      where: {
        id,
        createdBy: user.id,
      },
    });

    if (!existingCompany) {
      throw new Error("Company not found");
    }

    const trimmedLabel = company.trim();

    // Only recompute the match key when the label actually changed. Some
    // rows (e.g. mock-seeded companies) intentionally hold a `value` that
    // isn't derivable from their label — recomputing on every save would
    // collide with an unrelated company sharing the same canonical label.
    let value = existingCompany.value;
    if (trimmedLabel !== existingCompany.label) {
      value = canonicalizeEntityValue(trimmedLabel, { stripLegalSuffix: true });

      const companyExists = await prisma.company.findFirst({
        where: {
          value,
          createdBy: user.id,
        },
      });

      if (companyExists && companyExists.id !== id) {
        throw new Error("Company already exists!");
      }
    }

    const res = await prisma.company.update({
      where: {
        id,
        createdBy: user.id,
      },
      data: {
        value,
        label: company,
        logoUrl,
        websiteUrl,
        careersUrl,
        industry,
      },
    });

    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to update company.";
    return handleError(error, msg);
  }
};

export const deleteCompanyById = async (
  companyId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    // WorkExperience has no userId, so ownership runs through the resume
    // chain. The null-section arm keeps unsectioned rows blocking deletion
    // rather than letting it fail later on the foreign key.
    const experiences = await prisma.workExperience.count({
      where: {
        companyId,
        OR: [
          { ResumeSection: { Resume: { profile: { userId: user.id } } } },
          { resumeSectionId: null },
        ],
      },
    });
    if (experiences > 0) {
      throw new Error(
        `Company cannot be deleted due to its use in experience section of one of the resume! `,
      );
    }
    const jobs = await prisma.job.count({
      where: {
        companyId,
        userId: user.id,
      },
    });

    if (jobs > 0) {
      throw new Error(
        `Company cannot be deleted due to ${jobs} number of associated jobs! `,
      );
    }

    // Contact.companyId and .workedAtCompanyId are optional relations, whose
    // Prisma default is SetNull — deleting would silently blank the employer
    // rather than fail. This guard is the only thing stopping it.
    const contacts = await prisma.contact.count({
      where: {
        createdBy: user.id,
        OR: [{ companyId }, { workedAtCompanyId: companyId }],
      },
    });
    if (contacts > 0) {
      throw new Error(
        `Company cannot be deleted due to ${contacts} associated contact${contacts === 1 ? "" : "s"}! `,
      );
    }

    const res = await prisma.company.delete({
      where: {
        id: companyId,
        createdBy: user.id,
      },
    });
    return { res, success: true };
  } catch (error) {
    const msg = "Failed to delete company.";
    return handleError(error, msg);
  }
};
