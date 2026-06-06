import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import { Resume, SectionType } from "@/models/profile.model";
import { styles, SectionHeading } from "./primitives";
import { ResumeHtmlNodes } from "./generateResumePdf";

function formatDate(date: Date | undefined | null): string {
  if (!date) return "Present";
  return format(new Date(date), "MMM yyyy");
}

type Props = {
  resume: Resume;
  htmlNodes: ResumeHtmlNodes;
};

export function ProfessionalResumeDocument({ resume, htmlNodes }: Props) {
  const { ContactInfo, ResumeSections } = resume;

  const experienceSection = ResumeSections?.find(
    (s) => s.sectionType === SectionType.EXPERIENCE,
  );
  const educationSection = ResumeSections?.find(
    (s) => s.sectionType === SectionType.EDUCATION,
  );
  const certificationSection = ResumeSections?.find(
    (s) => s.sectionType === SectionType.CERTIFICATION,
  );

  const contactParts = [
    ContactInfo?.email,
    ContactInfo?.phone,
    ContactInfo?.address,
  ].filter(Boolean);

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
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.heading}>
              {ContactInfo.firstName} {ContactInfo.lastName}
            </Text>
            {ContactInfo.headline ? (
              <Text style={styles.subheading}>{ContactInfo.headline}</Text>
            ) : null}
            {contactParts.length > 0 ? (
              <Text style={styles.contactLine}>{contactParts.join(" · ")}</Text>
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

        {/* Experience */}
        {experienceSection?.workExperiences &&
          experienceSection.workExperiences.length > 0 && (
            <View>
              <SectionHeading title="Experience" />
              {experienceSection.workExperiences.map((exp, i) => (
                <View
                  key={exp.id ?? i}
                  style={{ marginBottom: 8 }}
                  wrap={false}
                >
                  <Text style={styles.entryTitle}>
                    {exp.jobTitle.label} — {exp.Company.label}
                  </Text>
                  <Text style={styles.entryMeta}>
                    {formatDate(exp.startDate)} – {formatDate(exp.endDate)} ·{" "}
                    {exp.location.label}
                  </Text>
                  {htmlNodes.experiences[i]}
                </View>
              ))}
            </View>
          )}

        {/* Education */}
        {educationSection?.educations &&
          educationSection.educations.length > 0 && (
            <View>
              <SectionHeading title="Education" />
              {educationSection.educations.map((edu, i) => (
                <View
                  key={edu.id ?? i}
                  style={{ marginBottom: 8 }}
                  wrap={false}
                >
                  <Text style={styles.entryTitle}>{edu.institution}</Text>
                  <Text style={styles.entryMeta}>
                    {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ")}
                  </Text>
                  <Text style={styles.entryMeta}>
                    {formatDate(edu.startDate)} –{" "}
                    {edu.endDate ? formatDate(edu.endDate) : "Present"} ·{" "}
                    {edu.location.label}
                  </Text>
                  {htmlNodes.educations[i]}
                </View>
              ))}
            </View>
          )}

        {/* Certifications */}
        {certificationSection?.licenseOrCertifications &&
          certificationSection.licenseOrCertifications.length > 0 && (
            <View>
              <SectionHeading title="Certifications" />
              {certificationSection.licenseOrCertifications.map((cert, i) => (
                <View
                  key={cert.id ?? i}
                  style={{ marginBottom: 6 }}
                  wrap={false}
                >
                  <Text style={styles.entryTitle}>{cert.title}</Text>
                  <Text style={styles.entryMeta}>{cert.organization}</Text>
                  {(cert.issueDate || cert.expirationDate) && (
                    <Text style={styles.entryMeta}>
                      {cert.issueDate
                        ? `Issued: ${formatDate(cert.issueDate)}`
                        : ""}
                      {cert.issueDate && cert.expirationDate ? " · " : ""}
                      {cert.expirationDate
                        ? `Expires: ${formatDate(cert.expirationDate)}`
                        : ""}
                    </Text>
                  )}
                  {cert.credentialUrl && (
                    <Text style={styles.entryMeta}>{cert.credentialUrl}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
      </Page>
    </Document>
  );
}
