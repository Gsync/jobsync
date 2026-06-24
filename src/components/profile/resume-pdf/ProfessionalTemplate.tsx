import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import { Resume, ResumeSection, SectionType } from "@/models/profile.model";
import { professionalStyles as s } from "./styles/professional.styles";
import { ResumeHtmlNodes } from "./generateResumePdf";

function formatDate(date: Date | undefined | null): string {
  if (!date) return "Present";
  return format(new Date(date), "MMM yyyy");
}

function yearRange(startDate: Date, endDate?: Date | null): string {
  const start = format(new Date(startDate), "yyyy");
  const end = endDate ? format(new Date(endDate), "yyyy") : "Present";
  return `${start} – ${end}`;
}

function SectionHeading({ title }: { title: string }) {
  return (
    <View style={s.sectionHeadingRow}>
      <Text style={s.sectionHeadingLabel}>{title}</Text>
      <View style={s.sectionHeadingRule} />
    </View>
  );
}

// Renders sections that use licenseOrCertifications (CERTIFICATION, LICENSE, COURSE, etc.)
function CertLikeSection({ section }: { section: ResumeSection }) {
  const entries = section.licenseOrCertifications;
  if (!entries || entries.length === 0) return null;
  return (
    <View>
      <SectionHeading title={section.sectionTitle} />
      {entries.map((cert, i) => (
        <View key={cert.id ?? i} style={{ marginBottom: 6 }} wrap={false}>
          <Text style={s.entryTitleBlock}>{cert.title}</Text>
          <Text style={s.entryMeta}>{cert.organization}</Text>
          {(cert.issueDate || cert.expirationDate) && (
            <Text style={s.entryMeta}>
              {cert.issueDate ? `Issued: ${formatDate(cert.issueDate)}` : ""}
              {cert.issueDate && cert.expirationDate ? " · " : ""}
              {cert.expirationDate ? `Expires: ${formatDate(cert.expirationDate)}` : ""}
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
};

export function ProfessionalResumeDocument({ resume, htmlNodes }: Props) {
  const { ContactInfo, ResumeSections } = resume;

  const summarySection = ResumeSections?.find(
    (sec) => sec.sectionType === SectionType.SUMMARY,
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

  const contactParts = [
    ContactInfo?.address,
    ContactInfo?.phone,
    ContactInfo?.email,
  ].filter(Boolean) as string[];

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
            {contactParts.length > 0 && (
              <View style={s.headerRight}>
                {contactParts.map((part, i) => (
                  <Text key={i} style={s.contactLine}>
                    {part}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Thick rule */}
        <View style={s.thickRule} />

        {/* Summary — no section heading */}
        {summarySection?.summary?.content && htmlNodes.summary.length > 0 && (
          <View style={{ marginBottom: 4 }}>{htmlNodes.summary}</View>
        )}

        {/* Experience */}
        {experienceSection?.workExperiences &&
          experienceSection.workExperiences.length > 0 && (
            <View>
              <SectionHeading title={experienceSection.sectionTitle} />
              {experienceSection.workExperiences.map((exp, i) => (
                <View key={exp.id ?? i} style={{ marginBottom: 8 }} wrap={false}>
                  <View style={s.entryHeaderRow}>
                    <Text style={s.entryTitle}>{exp.jobTitle.label}</Text>
                    <Text style={s.entryDate}>
                      {formatDate(exp.startDate)} – {formatDate(exp.endDate)}
                    </Text>
                  </View>
                  <Text style={s.entryMeta}>
                    {exp.Company.label}
                    {exp.location?.label ? ` · ${exp.location.label}` : ""}
                  </Text>
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
                <SectionHeading title={sec.sectionTitle} />
                {sec.workExperiences.map((exp, i) => (
                  <View key={exp.id ?? i} style={{ marginBottom: 8 }} wrap={false}>
                    <View style={s.entryHeaderRow}>
                      <Text style={s.entryTitle}>{exp.jobTitle.label}</Text>
                      <Text style={s.entryDate}>
                        {formatDate(exp.startDate)} – {formatDate(exp.endDate)}
                      </Text>
                    </View>
                    <Text style={s.entryMeta}>
                      {exp.Company.label}
                      {exp.location?.label ? ` · ${exp.location.label}` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            );
          }
          if (sec.licenseOrCertifications && sec.licenseOrCertifications.length > 0) {
            return <CertLikeSection key={sec.id} section={sec} />;
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
                  <SectionHeading title={educationSection.sectionTitle} />
                  {educationSection.educations.map((edu, i) => (
                    <View key={edu.id ?? i} style={{ marginBottom: 8 }} wrap={false}>
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
                  ))}
                </View>
              )}
            </View>

            {/* Right: Certifications and Licenses */}
            <View style={s.twoColRight}>
              {certLikeSections.map((sec) => (
                <CertLikeSection key={sec.id} section={sec} />
              ))}
            </View>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
