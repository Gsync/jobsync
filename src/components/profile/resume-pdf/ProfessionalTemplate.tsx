import React from "react";
import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import { Resume, ResumeSection, SectionType } from "@/models/profile.model";
import type { ProfessionalStyles } from "./styles/professional.styles";
import { ResumeHtmlNodes } from "./generateResumePdf";

function formatDate(date: Date | undefined | null): string {
  if (!date) return "Present";
  return format(new Date(date), "MMM yyyy");
}

function formatLocation(label: string | undefined): string {
  return label && label !== "Not specified" ? label : "";
}

function yearRange(startDate: Date, endDate?: Date | null): string {
  const start = format(new Date(startDate), "yyyy");
  const end = endDate ? format(new Date(endDate), "yyyy") : "Present";
  return `${start} – ${end}`;
}

function SectionHeading({
  title,
  s,
}: {
  title: string;
  s: ProfessionalStyles;
}) {
  return (
    <View style={s.sectionHeadingRow}>
      <Text style={s.sectionHeadingLabel}>{title}</Text>
      <View style={s.sectionHeadingRule} />
    </View>
  );
}

// Renders sections that use licenseOrCertifications (CERTIFICATION, LICENSE, COURSE, etc.)
function CertLikeSection({
  section,
  s,
}: {
  section: ResumeSection;
  s: ProfessionalStyles;
}) {
  const entries = section.licenseOrCertifications;
  if (!entries || entries.length === 0) return null;
  return (
    <View>
      <SectionHeading title={section.sectionTitle} s={s} />
      {entries.map((cert, i) => (
        <View key={cert.id ?? i} style={s.certBlock} wrap={false}>
          <Text style={s.entryTitleBlock}>{cert.title}</Text>
          <Text style={s.entryMeta}>{cert.organization}</Text>
          {(cert.issueDate || cert.expirationDate) && (
            <Text style={s.entryMeta}>
              {[
                cert.issueDate ? formatDate(cert.issueDate) : null,
                cert.expirationDate ? formatDate(cert.expirationDate) : null,
              ]
                .filter(Boolean)
                .join(" – ")}
            </Text>
          )}
          {cert.credentialUrl && (
            <Text style={s.entryMeta}>{cert.credentialUrl}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

type Props = {
  resume: Resume;
  htmlNodes: ResumeHtmlNodes;
  styles: ProfessionalStyles;
  showPageNumbers: boolean;
};

export function ProfessionalResumeDocument({
  resume,
  htmlNodes,
  styles: s,
  showPageNumbers,
}: Props) {
  const { ContactInfo, ResumeSections } = resume;

  const summarySection = ResumeSections?.find(
    (sec) => sec.sectionType === SectionType.SUMMARY,
  );
  const skillsSection = ResumeSections?.find(
    (sec) => sec.sectionType === SectionType.SKILLS,
  );
  const experienceSection = ResumeSections?.find(
    (sec) => sec.sectionType === SectionType.EXPERIENCE,
  );
  const educationSection = ResumeSections?.find(
    (sec) => sec.sectionType === SectionType.EDUCATION,
  );

  // All sections that render in the two-column area (right column)
  const certLikeSections = ResumeSections?.filter((sec) =>
    [SectionType.CERTIFICATION, SectionType.LICENSE].includes(sec.sectionType),
  ) ?? [];

  // Sections that don't fit the standard categories — rendered as experience-like blocks
  const otherSections = ResumeSections?.filter((sec) =>
    [SectionType.COURSE, SectionType.PROJECT, SectionType.OTHER].includes(sec.sectionType),
  ) ?? [];

  const hasContact = !!(
    ContactInfo?.address ||
    ContactInfo?.phone ||
    ContactInfo?.email ||
    ContactInfo?.url1 ||
    ContactInfo?.url2
  );

  return (
    <Document
      author={`${ContactInfo?.firstName ?? ""} ${ContactInfo?.lastName ?? ""}`.trim()}
      creator="jobsync.ca"
      producer="react-pdf"
      title={resume.title}
    >
      <Page size="A4" style={s.page} wrap>
        {/* Header */}
        {ContactInfo && (
          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <Text style={s.name}>
                {ContactInfo.firstName} {ContactInfo.lastName}
              </Text>
              {ContactInfo.headline ? (
                <Text style={s.headline}>{ContactInfo.headline}</Text>
              ) : null}
            </View>
            {hasContact && (
              <View style={s.headerRight}>
                {(ContactInfo.address || ContactInfo.phone) && (
                  <Text style={s.contactLine}>
                    {[ContactInfo.address, ContactInfo.phone].filter(Boolean).join(" · ")}
                  </Text>
                )}
                {ContactInfo.email && (
                  <Text style={s.contactLine}>{ContactInfo.email}</Text>
                )}
                {(ContactInfo.url1 || ContactInfo.url2) && (
                  <Text style={s.contactLine}>
                    {ContactInfo.url1 && (
                      <Link
                        src={ContactInfo.url1}
                        style={s.link}
                      >
                        {ContactInfo.url1.replace(/^https?:\/\/(www\.)?/, "")}
                      </Link>
                    )}
                    {ContactInfo.url1 && ContactInfo.url2 ? " · " : ""}
                    {ContactInfo.url2 && (
                      <Link
                        src={ContactInfo.url2}
                        style={s.link}
                      >
                        {ContactInfo.url2.replace(/^https?:\/\/(www\.)?/, "")}
                      </Link>
                    )}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Thick rule */}
        <View style={s.thickRule} />

        {/* Summary — no section heading */}
        {summarySection?.summary?.content && htmlNodes.summary.length > 0 && (
          <View style={s.summaryBlock}>{htmlNodes.summary}</View>
        )}

        {/* Skills */}
        {skillsSection?.skills && skillsSection.skills.length > 0 && (() => {
          const sorted = [...skillsSection.skills].sort((a, b) => a.order - b.order);
          const grouped = new Map<string, typeof sorted>();
          for (const sk of sorted) {
            const key = sk.category ?? "";
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(sk);
          }
          const hasCategories = Array.from(grouped.keys()).some((k) => k !== "");
          return (
            <View>
              <SectionHeading title={skillsSection.sectionTitle} s={s} />
              {hasCategories ? (() => {
                const entries = Array.from(grouped.entries());
                const rows: (typeof entries)[] = [];
                for (let i = 0; i < entries.length; i += 2) {
                  rows.push(entries.slice(i, i + 2));
                }
                return rows.map((row, rowIdx) => (
                  <View key={rowIdx} style={s.skillTwoColRow}>
                    {row.map(([cat, items]) => (
                      <View key={cat || "__flat"} style={s.twoColLeft}>
                        {cat ? (
                          <Text style={s.skillCatLabel}>
                            {cat}
                          </Text>
                        ) : null}
                        <Text style={s.skillVals}>
                          {items.map((sk) => sk.Tag?.label).filter(Boolean).join(" · ")}
                        </Text>
                      </View>
                    ))}
                    {row.length === 1 ? <View style={s.twoColRight} /> : null}
                  </View>
                ));
              })() : (
                <Text style={s.skillVals}>
                  {sorted.map((sk) => sk.Tag?.label).filter(Boolean).join(" · ")}
                </Text>
              )}
            </View>
          );
        })()}

        {/* Experience */}
        {experienceSection?.workExperiences &&
          experienceSection.workExperiences.length > 0 && (
            <View>
              <SectionHeading title={experienceSection.sectionTitle} s={s} />
              {experienceSection.workExperiences.map((exp, i) => (
                <View key={exp.id ?? i} style={s.entryBlock}>
                  <View wrap={false}>
                    <View style={s.entryHeaderRow}>
                      <Text style={s.entryTitle}>{exp.jobTitle.label}</Text>
                      <Text style={s.entryDate}>
                        {formatDate(exp.startDate)} – {formatDate(exp.endDate)}
                      </Text>
                    </View>
                    <Text style={s.entryMeta}>
                      {exp.Company.label}
                      {formatLocation(exp.location?.label) &&
                        ` · ${formatLocation(exp.location?.label)}`}
                    </Text>
                  </View>
                  {htmlNodes.experiences[i]}
                </View>
              ))}
            </View>
          )}

        {/* Other sections with work-experience-like entries (PROJECT, COURSE, OTHER) */}
        {otherSections.map((sec) => {
          if (sec.workExperiences && sec.workExperiences.length > 0) {
            return (
              <View key={sec.id}>
                <SectionHeading title={sec.sectionTitle} s={s} />
                {sec.workExperiences.map((exp, i) => (
                  <View key={exp.id ?? i} style={s.entryBlock}>
                    <View wrap={false}>
                      <View style={s.entryHeaderRow}>
                        <Text style={s.entryTitle}>{exp.jobTitle.label}</Text>
                        <Text style={s.entryDate}>
                          {formatDate(exp.startDate)} – {formatDate(exp.endDate)}
                        </Text>
                      </View>
                      <Text style={s.entryMeta}>
                        {exp.Company.label}
                        {formatLocation(exp.location?.label) &&
                        ` · ${formatLocation(exp.location?.label)}`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            );
          }
          if (sec.licenseOrCertifications && sec.licenseOrCertifications.length > 0) {
            return <CertLikeSection key={sec.id} section={sec} s={s} />;
          }
          return null;
        })}

        {/* Two-column: Education (left) + Cert-like sections (right) */}
        {(educationSection?.educations?.length || certLikeSections.some((sec) => sec.licenseOrCertifications?.length)) ? (
          <View style={s.twoColRow}>
            {/* Left: Education */}
            <View style={s.twoColLeft}>
              {educationSection?.educations && educationSection.educations.length > 0 && (
                <View>
                  <SectionHeading title={educationSection.sectionTitle} s={s} />
                  {educationSection.educations.map((edu, i) => (
                    <View key={edu.id ?? i} style={s.entryBlock}>
                      <View wrap={false}>
                        <View style={s.entryHeaderRow}>
                          <Text style={s.entryTitle}>
                            {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ")}
                          </Text>
                          <Text style={s.entryDate}>
                            {yearRange(edu.startDate, edu.endDate)}
                          </Text>
                        </View>
                        <Text style={s.entryMeta}>{edu.institution}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Right: Certifications and Licenses */}
            <View style={s.twoColRight}>
              {certLikeSections.map((sec) => (
                <CertLikeSection key={sec.id} section={sec} s={s} />
              ))}
            </View>
          </View>
        ) : null}
        {showPageNumbers && (
          <Text
            fixed
            style={s.pageNumber}
            render={({ pageNumber, totalPages }) =>
              totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : ""
            }
          />
        )}
      </Page>
    </Document>
  );
}
