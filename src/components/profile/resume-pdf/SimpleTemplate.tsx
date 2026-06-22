import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
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
              <Text style={simpleStyles.contactLine}>{contactParts.join(" · ")}</Text>
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
              <SectionHeading title={experienceSection.sectionTitle} />
              {experienceSection.workExperiences.map((exp, i) => (
                <View key={exp.id ?? i} style={{ marginBottom: 8 }} wrap={false}>
                  <Text style={simpleStyles.entryTitle}>
                    {exp.jobTitle.label} — {exp.Company.label}
                  </Text>
                  <Text style={simpleStyles.entryMeta}>
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
              <SectionHeading title={educationSection.sectionTitle} />
              {educationSection.educations.map((edu, i) => (
                <View key={edu.id ?? i} style={{ marginBottom: 8 }} wrap={false}>
                  <Text style={simpleStyles.entryTitle}>{edu.institution}</Text>
                  <Text style={simpleStyles.entryMeta}>
                    {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ")}
                  </Text>
                  <Text style={simpleStyles.entryMeta}>
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
              <SectionHeading title={certificationSection.sectionTitle} />
              {certificationSection.licenseOrCertifications.map((cert, i) => (
                <View key={cert.id ?? i} style={{ marginBottom: 6 }} wrap={false}>
                  <Text style={simpleStyles.entryTitle}>{cert.title}</Text>
                  <Text style={simpleStyles.entryMeta}>{cert.organization}</Text>
                  {(cert.issueDate || cert.expirationDate) && (
                    <Text style={simpleStyles.entryMeta}>
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
