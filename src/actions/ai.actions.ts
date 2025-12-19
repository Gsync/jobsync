"use server";

import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { resumeReviewPrompt, jobMatchPrompt } from "@/lib/ai.prompts";
import { Resume } from "@/models/profile.model";
import { JobResponse } from "@/models/job.model";
import { convertJobToText, convertResumeToText } from "@/utils/ai.utils";

export const getResumeReviewByOllama = async (
  resume: Resume,
  aImodel?: string
): Promise<ReadableStream | undefined> => {
  const resumeText = await convertResumeToText(resume);
  const inputMessage = await resumeReviewPrompt.format({
    resume: resumeText,
  });

  const model = new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    model: aImodel,
    temperature: 0,
    format: "json",
  });

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
};

export const getResumeReviewByOpenAi = async (
  resume: Resume,
  aImodel?: string
): Promise<ReadableStream | undefined> => {
  const resumeText = await convertResumeToText(resume);
  const inputMessage = await resumeReviewPrompt.format({
    resume: resumeText,
  });

  const model = new ChatOpenAI({
    model: aImodel,
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
    maxConcurrency: 1,
    maxTokens: 3000,
  });

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
  const model = new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    model: aiModel,
    temperature: 0,
    format: "json",
    maxConcurrency: 1,
    numCtx: 3000,
  });

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
  const model = new ChatOpenAI({
    model: aiModel,
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
    maxConcurrency: 1,
    maxTokens: 3000,
  });

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
};
