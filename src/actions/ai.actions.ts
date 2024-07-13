"use server";

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  ContactInfo,
  Education,
  Resume,
  ResumeSection,
  SectionType,
  WorkExperience,
} from "@/models/profile.model";

export const getResumeReviewByAi = async (
  resume: Resume,
  modelProvider?: string
): Promise<any | undefined> => {
  //   const model = new ChatOpenAI({
  //     modelName: "gpt-3.5-turbo",
  //     openAIApiKey: process.env.OPENAI_API_KEY,
  //   });

  //   const messages = [
  //     new SystemMessage("Translate the following from English into Italian"),
  //     new HumanMessage("hi!"),
  //   ];

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `
      You are an expert resume writer. Format all responses as JSON object in the following format.
    
        summary: Provide a brief summary of the resume.
        strengths: List the strengths of the resume.
        weaknesses: List the weaknesses of the resume.
        suggestions: Provide suggestions for improvement in a list of string.
        score: Provide a score for the resume (0-100).
      `,
    ],
    ["human", `Review the resume {resume} and provide feedback.`],
  ]);
  const resumeText = convertResumeToText(resume);

  const inputMessage = await prompt.format({ resume: resumeText });

  const model = new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: "llama3",
    format: "json",
  });

  const stream = await model
    .pipe(new StringOutputParser())
    // .invoke(inputMessage);
    .stream(inputMessage);
  // return response;
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
};

const convertResumeToText = (resume: Resume) => {
  const formatContactInfo = (contactInfo?: ContactInfo) => {
    if (!contactInfo) return "";
    return `
      Name: ${contactInfo.firstName} ${contactInfo.lastName}
      Headline: ${contactInfo.headline}
      Email: ${contactInfo.email || "N/A"}
      Phone: ${contactInfo.phone || "N/A"}
      Address: ${contactInfo.address || "N/A"}
    `;
  };

  const formatWorkExperiences = (workExperiences?: WorkExperience[]) => {
    if (!workExperiences || workExperiences.length === 0) return "";
    return workExperiences
      .map(
        (experience) => `
      Company: ${experience.Company.label}
      Job Title: ${experience.jobTitle.label}
      Location: ${experience.location.label}
      Description: ${experience.description}
      `
      )
      .join("\n");
  };
  // Start Date: ${experience.startDate.toLocaleDateString().split("T")[0]}
  // End Date: ${
  //   experience.currentJob
  //     ? "Present"
  //     : experience.endDate.toLocaleDateString().split("T")[0]
  // }

  const formatEducation = (educations?: Education[]) => {
    if (!educations || educations.length === 0) return "";
    return (
      educations
        .map(
          (education) => `
      Institution: ${education.institution}
      Degree: ${education.degree}
      Field of Study: ${education.fieldOfStudy}
      Location: ${education.location}
      Description: ${education.description || "N/A"}
      `
        )
        // Start Date: ${education.startDate.toLocaleDateString().split("T")[0]}
        // End Date: ${
        //   education.endDate
        //     ? education.endDate.toLocaleDateString().split("T")[0]
        //     : "N/A"
        // }
        .join("\n")
    );
  };

  const formatResumeSections = (sections?: ResumeSection[]) => {
    if (!sections || sections.length === 0) return "";
    return sections
      .map((section) => {
        switch (section.sectionType) {
          case SectionType.SUMMARY:
            return `Summary: ${section.summary?.content || "N/A"}`;
          case SectionType.EXPERIENCE:
            return formatWorkExperiences(section.workExperiences);
          case SectionType.EDUCATION:
            return formatEducation(section.educations);
          default:
            return "";
        }
      })
      .join("\n");
  };

  const inputMessage = `
    You are an expert resume reviewer, review the following resume:

    Title: ${resume.title}
    ${formatContactInfo(resume.ContactInfo)}
    ${formatResumeSections(resume.ResumeSections)}
  `;
  return inputMessage;
};
