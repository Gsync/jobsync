import { JobResponse } from "@/models/job.model";
import {
  ContactInfo,
  Education,
  Resume,
  ResumeSection,
  SectionType,
  WorkExperience,
} from "@/models/profile.model";
import { AiProvider } from "@/models/ai.model";

const removeHtmlTags = (description: string | undefined): string => {
  if (!description) return "";

  return (
    description
      // Convert list items to bullet points before stripping tags
      .replace(/<li[^>]*>/gi, "• ")
      // Add line breaks after block elements
      .replace(/<\/(li|p|div|br)[^>]*>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      // Remove all remaining HTML tags
      .replace(/<[^>]+>/g, " ")
      // Clean up excessive whitespace while preserving structure
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim()
  );
};

export interface ModelCheckResult {
  isRunning: boolean;
  error?: string;
  runningModelName?: string;
}

/**
 * Check if an Ollama model is currently running
 * @param modelName - The name of the model to check
 * @param provider - The AI provider (only checks for Ollama)
 * @returns ModelCheckResult with isRunning status and optional error message
 */
export const checkIfModelIsRunning = async (
  modelName: string | undefined,
  provider: AiProvider
): Promise<ModelCheckResult> => {
  // Only check for Ollama provider
  if (provider !== AiProvider.OLLAMA) {
    return { isRunning: true };
  }

  if (!modelName) {
    return {
      isRunning: false,
      error: "No model selected. Please select an AI model in settings first.",
    };
  }

  try {
    // Check if Ollama service is accessible
    const response = await fetch("http://localhost:11434/api/ps", {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return {
        isRunning: false,
        error:
          "Ollama service is not responding. Please make sure Ollama is running.",
      };
    }

    const data = await response.json();

    if (!data.models || data.models.length === 0) {
      return {
        isRunning: false,
        error: `No Ollama model is currently running. Please start ${modelName} using: ollama run ${modelName}`,
      };
    }

    const isRunning = data.models.some((m: any) => m.name === modelName);

    if (!isRunning) {
      return {
        isRunning: false,
        error: `${modelName} is not currently running. Please run the model first.`,
      };
    }

    return { isRunning: true, runningModelName: modelName };
  } catch (error) {
    console.error("Error checking if model is running:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      isRunning: false,
      error: `Cannot connect to Ollama service. Please make sure Ollama is running. Error: ${errorMessage}`,
    };
  }
};

/**
 * Fetch list of all running Ollama models
 * @returns Array of model names currently running
 */
export const fetchRunningModels = async (): Promise<{
  models: string[];
  error?: string;
}> => {
  try {
    const response = await fetch("http://localhost:11434/api/ps", {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return {
        models: [],
        error: "Failed to fetch running models. Make sure Ollama is running.",
      };
    }

    const data = await response.json();
    const models = data.models?.map((m: any) => m.name) || [];
    return { models };
  } catch (error) {
    console.error("Error fetching running models:", error);
    return {
      models: [],
      error: "Cannot connect to Ollama service.",
    };
  }
};

export const convertResumeToText = (resume: Resume): Promise<string> => {
  return new Promise((resolve) => {
    const formatContactInfo = (contactInfo?: ContactInfo) => {
      if (!contactInfo) return "";
      const parts = [
        `Name: ${contactInfo.firstName} ${contactInfo.lastName}`,
        contactInfo.headline ? `Headline: ${contactInfo.headline}` : "",
        contactInfo.email ? `Email: ${contactInfo.email}` : "",
        contactInfo.phone ? `Phone: ${contactInfo.phone}` : "",
        contactInfo.address ? `Address: ${contactInfo.address}` : "",
      ].filter(Boolean);
      return parts.join("\n");
    };

    const formatWorkExperiences = (workExperiences?: WorkExperience[]) => {
      if (!workExperiences || workExperiences.length === 0) return "";
      return workExperiences
        .map((experience) => {
          const desc = removeHtmlTags(experience.description);
          const parts = [
            `Company: ${experience.Company.label}`,
            `Job Title: ${experience.jobTitle.label}`,
            `Location: ${experience.location.label}`,
            desc ? `Description: ${desc}` : "",
          ].filter(Boolean);
          return parts.join("\n");
        })
        .join("\n\n");
    };
    // Start Date: ${experience.startDate.toLocaleDateString().split("T")[0]}
    // End Date: ${
    //   experience.currentJob
    //     ? "Present"
    //     : experience.endDate.toLocaleDateString().split("T")[0]
    // }

    const formatEducation = (educations?: Education[]) => {
      if (!educations || educations.length === 0) return "";
      return educations
        .map((education) => {
          const desc = removeHtmlTags(education.description);
          const parts = [
            `Institution: ${education.institution}`,
            `Degree: ${education.degree}`,
            `Field of Study: ${education.fieldOfStudy}`,
            `Location: ${education.location.label}`,
            desc ? `Description: ${desc}` : "",
          ].filter(Boolean);
          return parts.join("\n");
        })
        .join("\n\n");
    };

    const formatResumeSections = (sections?: ResumeSection[]) => {
      if (!sections || sections.length === 0) return "";
      return sections
        .map((section) => {
          switch (section.sectionType) {
            case SectionType.SUMMARY:
              return `Summary: ${removeHtmlTags(section.summary?.content)}`;
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
                 
                 Title: ${resume.title}
                 ${formatContactInfo(resume.ContactInfo)}
                 ${formatResumeSections(resume.ResumeSections)}
                 `;
    return resolve(inputMessage);
  });
};

export const convertJobToText = (job: JobResponse): Promise<string> => {
  return new Promise((resolve) => {
    const {
      description,
      JobTitle: { label: jobTitle },
      Company: { label: companyName },
      Location: { label: location },
    } = job;

    const jobText = `
       Job Title: ${jobTitle}
       Company: ${companyName}
       Location: ${location}
       Description: ${removeHtmlTags(description)}
     `;

    return resolve(jobText);
  });
};
