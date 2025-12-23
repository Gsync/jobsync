"use server";

import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { resumeReviewPrompt, jobMatchPrompt } from "@/lib/ai.prompts";
import { Resume } from "@/models/profile.model";
import { JobResponse } from "@/models/job.model";
import { convertJobToText, convertResumeToText } from "@/utils/ai.utils";

// --- Helpers ---
type ModelType = "ollama" | "openai";

interface ModelOptions {
  modelType: ModelType;
  modelName?: string;
  baseUrl?: string;
  apiKey?: string;
  temperature?: number;
  format?: string;
  maxConcurrency?: number;
  maxTokens?: number;
  numCtx?: number;
}

function createModel(options: ModelOptions) {
  const {
    modelType,
    modelName,
    baseUrl,
    apiKey,
    temperature = 0,
    format,
    maxConcurrency = 1,
    maxTokens,
    numCtx,
  } = options;
  if (modelType === "ollama") {
    return new ChatOllama({
      baseUrl:
        baseUrl || process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
      model: modelName,
      temperature,
      format,
      maxConcurrency,
      numCtx,
    });
  } else {
    return new ChatOpenAI({
      model: modelName,
      openAIApiKey: apiKey || process.env.OPENAI_API_KEY,
      temperature,
      maxConcurrency,
      maxTokens,
    });
  }
}

async function streamResponse(
  model: any,
  inputMessage: any
): Promise<ReadableStream> {
  const stream = await model.stream(inputMessage);
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const content =
          typeof chunk.content === "string"
            ? chunk.content
            : JSON.stringify(chunk.content);
        controller.enqueue(encoder.encode(content));
      }
      controller.close();
    },
  });
}

// --- Main Functions ---

export const getResumeReviewByOllama = async (
  resume: Resume,
  aiModel?: string
): Promise<ReadableStream | undefined> => {
  const resumeText = await convertResumeToText(resume);
  const inputMessage = await resumeReviewPrompt.format({ resume: resumeText });
  const model = createModel({
    modelType: "ollama",
    modelName: aiModel,
    format: "json",
  });
  return streamResponse(model, inputMessage);
};

export const getResumeReviewByOpenAi = async (
  resume: Resume,
  aiModel?: string
): Promise<ReadableStream | undefined> => {
  const resumeText = await convertResumeToText(resume);
  const inputMessage = await resumeReviewPrompt.format({ resume: resumeText });
  const model = createModel({
    modelType: "openai",
    modelName: aiModel,
    maxTokens: 3000,
  });
  return streamResponse(model, inputMessage);
};

export const getJobMatchByOllama = async (
  resume: Resume,
  job: JobResponse,
  aiModel?: string
): Promise<ReadableStream | undefined> => {
  const resumeText = await convertResumeToText(resume);
  const jobText = await convertJobToText(job);
  const inputMessage = await jobMatchPrompt.format({
    resume: resumeText || "No resume provided",
    job_description: jobText,
  });
  const model = createModel({
    modelType: "ollama",
    modelName: aiModel,
    format: "json",
    numCtx: 3000,
  });
  return streamResponse(model, inputMessage);
};

export const getJobMatchByOpenAi = async (
  resume: Resume,
  job: JobResponse,
  aiModel?: string
): Promise<ReadableStream | undefined> => {
  const resumeText = await convertResumeToText(resume);
  const jobText = await convertJobToText(job);
  const inputMessage = await jobMatchPrompt.format({
    resume: resumeText || "No resume provided",
    job_description: jobText,
  });
  const model = createModel({
    modelType: "openai",
    modelName: aiModel,
    maxTokens: 3000,
  });
  return streamResponse(model, inputMessage);
};
