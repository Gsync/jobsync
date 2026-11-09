import prisma from "@/lib/db";
import { SectionType } from "@/models/profile.model";
import { isPresentMarker, parseNamedMonthYear } from "./dates";

// Not a "use server" module: shared across src/actions/resumeImport/ modules,
// so it must stay importable without becoming a callable server-action endpoint.

export function parseImportDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  if (isPresentMarker(s)) return null;

  // "Jan 2020" / "janvier 2020" / "Januar 2020" — any locale Intl knows
  const named = parseNamedMonthYear(s);
  if (named) return named;

  // "2020"
  if (/^\d{4}$/.test(s.trim())) {
    return new Date(parseInt(s.trim()), 0, 1);
  }

  // MM/YYYY or MM-YYYY
  const mmyyyy = /^(\d{1,2})[/-](\d{4})$/.exec(s.trim());
  if (mmyyyy) {
    return new Date(parseInt(mmyyyy[2]), parseInt(mmyyyy[1]) - 1, 1);
  }

  // YYYY-MM or YYYY/MM
  const yyyymm = /^(\d{4})[/-](\d{1,2})$/.exec(s.trim());
  if (yyyymm) {
    return new Date(parseInt(yyyymm[1]), parseInt(yyyymm[2]) - 1, 1);
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
export function wrapAsHtml(text: string | undefined): string {
  if (!text?.trim()) return "<p></p>";
  return text
    .split(/\n+/)
    .map((line) => `<p>${escapeHtml(line.trim())}</p>`)
    .join("");
}

// Find-or-create a ResumeSection by type — shared by experience, education,
// and certification, which (unlike summary) don't need to branch on whether
// a nested child record already exists.
export async function getOrCreateResumeSection(
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
