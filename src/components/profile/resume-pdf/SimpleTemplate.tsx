import React from "react";
import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import { Resume, SectionType } from "@/models/profile.model";
import { simpleStyles } from "./styles/simple.styles";
import { ResumeHtmlNodes } from "./generateResumePdf";

function formatDate(date: Date | undefined | null): string {
  if (!date) return "Present";
  return format(new Date(date), "MMM yyyy");
}

function SectionHeading({ title }: { title: string }) {
  return (
    <View>
      <Text style={simpleStyles.sectionTitle}>{title}</Text>
      <View style={simpleStyles.divider} />
    </View>
  );
}

type Props = {
  resume: Resume;
  htmlNodes: ResumeHtmlNodes;
};

export function SimpleResumeDocument({ resume, htmlNodes }: Props) {
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

  type ContactPart = { text: string; href?: string };
  const contactParts: ContactPart[] = [
    ContactInfo?.email ? { text: ContactInfo.email } : null,
    ContactInfo?.phone ? { text: ContactInfo.phone } : null,
    ContactInfo?.address ? { text: ContactInfo.address } : null,
    ContactInfo?.url1
      ? { text: ContactInfo.url1.replace(/^https?:\/\/(www\.)?/, ""), href: ContactInfo.url1 }
      : null,
    ContactInfo?.url2
      ? { text: ContactInfo.url2.replace(/^https?:\/\/(www\.)?/, ""), href: ContactInfo.url2 }
      : null,
  ].filter((p): p is ContactPart => p !== null);

  return (
    <Document
      author={`${ContactInfo?.firstName ?? ""} ${ContactInfo?.lastName ?? ""}`.trim()}
      creator="jobsync.ca"
      producer="react-pdf"
      title={resume.title}
    >
      <Page size="A4" style={simpleStyles.page} wrap>
        {/* Header */}
        {ContactInfo && (
          <View style={{ marginBottom: 12 }}>
            <Text style={simpleStyles.heading}>
              {ContactInfo.firstName} {ContactInfo.lastName}
            </Text>
            {ContactInfo.headline ? (
              <Text style={simpleStyles.subheading}>{ContactInfo.headline}</Text>
            ) : null}
            {contactParts.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {contactParts.map((part, i) => (
                  <Text key={i} style={simpleStyles.contactLine}>
                    {i > 0 ? " · " : ""}
                    {part.href ? (
                      <Link src={part.href} style={{ color: "#000000", textDecoration: "none" }}>
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
            <SectionHeading title="Summary" />
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
              <SectionHeading title={skillsSection.sectionTitle} />
              {hasCategories ? (
                Array.from(grouped.entries()).map(([cat, items]) => (
                  <View key={cat || "__flat"} style={simpleStyles.skillRow}>
                    {cat ? (
                      <Text style={simpleStyles.skillCat}>{cat.toUpperCase()}</Text>
                    ) : null}
                    <Text style={simpleStyles.skillVals}>
                      {items.map((s) => s.Tag?.label).filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={simpleStyles.bodyText}>
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
              <SectionHeading title={experienceSection.sectionTitle} />
              {experienceSection.workExperiences.map((exp, i) => (
                <View key={exp.id ?? i} style={{ marginBottom: 8 }}>
                  <View wrap={false}>
                    <Text style={simpleStyles.entryTitle}>
                      {exp.jobTitle.label} — {exp.Company.label}
                    </Text>
                    <Text style={simpleStyles.entryMeta}>
                      {formatDate(exp.startDate)} – {formatDate(exp.endDate)} ·{" "}
                      {exp.location.label}
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
              <SectionHeading title={educationSection.sectionTitle} />
              {educationSection.educations.map((edu, i) => (
                <View key={edu.id ?? i} style={{ marginBottom: 8 }}>
                  <View wrap={false}>
                    <Text style={simpleStyles.entryTitle}>{edu.institution}</Text>
                    <Text style={simpleStyles.entryMeta}>
                      {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ")}
                    </Text>
                    <Text style={simpleStyles.entryMeta}>
                      {formatDate(edu.startDate)} –{" "}
                      {edu.endDate ? formatDate(edu.endDate) : "Present"} ·{" "}
                      {edu.location.label}
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
              <SectionHeading title={certificationSection.sectionTitle} />
              {certificationSection.licenseOrCertifications.map((cert, i) => (
                <View key={cert.id ?? i} style={{ marginBottom: 6 }} wrap={false}>
                  <Text style={simpleStyles.entryTitle}>{cert.title}</Text>
                  <Text style={simpleStyles.entryMeta}>{cert.organization}</Text>
                  {(cert.issueDate || cert.expirationDate) && (
                    <Text style={simpleStyles.entryMeta}>
                      {[
                        cert.issueDate ? formatDate(cert.issueDate) : null,
                        cert.expirationDate ? formatDate(cert.expirationDate) : null,
                      ]
                        .filter(Boolean)
                        .join(" – ")}
                    </Text>
                  )}
                  {cert.credentialUrl && (
                    <Text style={simpleStyles.entryMeta}>{cert.credentialUrl}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
      </Page>
    </Document>
  );
}
