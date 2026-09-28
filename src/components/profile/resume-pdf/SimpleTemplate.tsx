import React from "react";
import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import { Resume, SectionType } from "@/models/profile.model";
import { buildContactParts } from "../pdf-contact-parts";
import type { SimpleStyles } from "./styles/simple.styles";
import { ResumeHtmlNodes } from "./generateResumePdf";

function formatDate(date: Date | undefined | null): string {
  if (!date) return "Present";
  return format(new Date(date), "MMM yyyy");
}

function formatLocation(label: string | undefined): string {
  return label && label !== "Not specified" ? label : "";
}

function SectionHeading({
  title,
  styles,
}: {
  title: string;
  styles: SimpleStyles;
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.divider} />
    </View>
  );
}

type Props = {
  resume: Resume;
  htmlNodes: ResumeHtmlNodes;
  styles: SimpleStyles;
  showPageNumbers: boolean;
};

export function SimpleResumeDocument({
  resume,
  htmlNodes,
  styles,
  showPageNumbers,
}: Props) {
  const { ContactInfo, ResumeSections } = resume;

  const skillsSection = ResumeSections?.find(
    (s) => s.sectionType === SectionType.SKILLS,
  );
  const experienceSection = ResumeSections?.find(
    (s) => s.sectionType === SectionType.EXPERIENCE,
  );
  const educationSection = ResumeSections?.find(
    (s) => s.sectionType === SectionType.EDUCATION,
  );
  const certificationSection = ResumeSections?.find(
    (s) => s.sectionType === SectionType.CERTIFICATION,
  );

  const contactParts = buildContactParts(ContactInfo);

  return (
    <Document
      author={`${ContactInfo?.firstName ?? ""} ${ContactInfo?.lastName ?? ""}`.trim()}
      creator="jobsync.ca"
      producer="react-pdf"
      title={resume.title}
    >
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        {ContactInfo && (
          <View style={styles.headerBlock}>
            <Text style={styles.heading}>
              {ContactInfo.firstName} {ContactInfo.lastName}
            </Text>
            {ContactInfo.headline ? (
              <Text style={styles.subheading}>{ContactInfo.headline}</Text>
            ) : null}
            {contactParts.length > 0 ? (
              <View style={styles.contactRow}>
                {contactParts.map((part, i) => (
                  <Text key={i} style={styles.contactLine}>
                    {i > 0 ? " · " : ""}
                    {part.href ? (
                      <Link src={part.href} style={styles.link}>
                        {part.text}
                      </Link>
                    ) : (
                      part.text
                    )}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        )}

        {/* Summary */}
        {htmlNodes.summary.length > 0 && (
          <View>
            <SectionHeading title="Summary" styles={styles} />
            {htmlNodes.summary}
          </View>
        )}

        {/* Skills */}
        {skillsSection?.skills && skillsSection.skills.length > 0 && (() => {
          const sorted = [...skillsSection.skills].sort((a, b) => a.order - b.order);
          const grouped = new Map<string, typeof sorted>();
          for (const s of sorted) {
            const key = s.category ?? "";
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(s);
          }
          const hasCategories = Array.from(grouped.keys()).some((k) => k !== "");
          return (
            <View>
              <SectionHeading title={skillsSection.sectionTitle} styles={styles} />
              {hasCategories ? (
                Array.from(grouped.entries()).map(([cat, items]) => (
                  <View key={cat || "__flat"} style={styles.skillRow}>
                    {cat ? (
                      <Text style={styles.skillCat}>{cat.toUpperCase()}</Text>
                    ) : null}
                    <Text style={styles.skillVals}>
                      {items.map((s) => s.Tag?.label).filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.bodyText}>
                  {sorted.map((s) => s.Tag?.label).filter(Boolean).join(" · ")}
                </Text>
              )}
            </View>
          );
        })()}

        {/* Experience */}
        {experienceSection?.workExperiences &&
          experienceSection.workExperiences.length > 0 && (
            <View>
              <SectionHeading title={experienceSection.sectionTitle} styles={styles} />
              {experienceSection.workExperiences.map((exp, i) => (
                <View key={exp.id ?? i} style={styles.entryBlock}>
                  <View wrap={false}>
                    <Text style={styles.entryTitle}>
                      {exp.jobTitle.label} — {exp.Company.label}
                    </Text>
                    <Text style={styles.entryMeta}>
                      {formatDate(exp.startDate)} – {formatDate(exp.endDate)}
                      {formatLocation(exp.location.label) &&
                        ` · ${formatLocation(exp.location.label)}`}
                    </Text>
                  </View>
                  {htmlNodes.experiences[i]}
                </View>
              ))}
            </View>
          )}

        {/* Education */}
        {educationSection?.educations &&
          educationSection.educations.length > 0 && (
            <View>
              <SectionHeading title={educationSection.sectionTitle} styles={styles} />
              {educationSection.educations.map((edu, i) => (
                <View key={edu.id ?? i} style={styles.entryBlock}>
                  <View wrap={false}>
                    <Text style={styles.entryTitle}>{edu.institution}</Text>
                    <Text style={styles.entryMeta}>
                      {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ")}
                    </Text>
                    <Text style={styles.entryMeta}>
                      {formatDate(edu.startDate)} –{" "}
                      {edu.endDate ? formatDate(edu.endDate) : "Present"}
                      {formatLocation(edu.location.label) &&
                        ` · ${formatLocation(edu.location.label)}`}
                    </Text>
                  </View>
                  {htmlNodes.educations[i]}
                </View>
              ))}
            </View>
          )}

        {/* Certifications */}
        {certificationSection?.licenseOrCertifications &&
          certificationSection.licenseOrCertifications.length > 0 && (
            <View>
              <SectionHeading title={certificationSection.sectionTitle} styles={styles} />
              {certificationSection.licenseOrCertifications.map((cert, i) => (
                <View key={cert.id ?? i} style={styles.certBlock} wrap={false}>
                  <Text style={styles.entryTitle}>{cert.title}</Text>
                  <Text style={styles.entryMeta}>{cert.organization}</Text>
                  {(cert.issueDate || cert.expirationDate) && (
                    <Text style={styles.entryMeta}>
                      {[
                        cert.issueDate ? formatDate(cert.issueDate) : null,
                        cert.expirationDate ? formatDate(cert.expirationDate) : null,
                      ]
                        .filter(Boolean)
                        .join(" – ")}
                    </Text>
                  )}
                  {cert.credentialUrl && (
                    <Text style={styles.entryMeta}>{cert.credentialUrl}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        {showPageNumbers && (
          <Text
            fixed
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : ""
            }
          />
        )}
      </Page>
    </Document>
  );
}
