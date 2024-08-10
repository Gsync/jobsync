"use server";

import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import {
  StringOutputParser,
  StructuredOutputParser,
} from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Resume } from "@/models/profile.model";
import { JobResponse } from "@/models/job.model";
import { convertJobToText, convertResumeToText } from "@/utils/ai.utils";

export const getResumeReviewByOllama = async (
  resume: Resume,
  aImodel?: string
): Promise<ReadableStream | undefined> => {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `
      You are an expert resume writer and career coach. You must always return JSON object with following structure.
    
        summary: Provide a brief summary of the resume review.
        strengths: List the strengths in the resume.
        weaknesses: List the weaknesses in the resume.
        suggestions: Provide suggestions for improvement in a list of string.
        score: Provide a score for the resume (0-100).
      `,
    ],
    [
      "human",
      `
      Review the resume provided below and and provide feedback in the specified JSON format.
      
      {resume}
      `,
    ],
  ]);

  const resumeText = await convertResumeToText(resume);

  const inputMessage = await prompt.format({ resume: resumeText });

  const model = new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    model: aImodel,
    temperature: 0,
    format: "json",
  });

  const stream = await model
    .pipe(new StringOutputParser())
    .stream(inputMessage);
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

export const getResumeReviewByOpenAi = async (
  resume: Resume,
  aImodel?: string
): Promise<ReadableStream | undefined> => {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `
      You are an expert resume writer and career coach. You must only return JSON object with following property structure.
    
        summary: Provide a brief summary of the resume review.
        strengths: List the strengths in the resume.
        weaknesses: List the weaknesses in the resume.
        suggestions: Provide suggestions for improvement in a list of string.
        score: Provide a score for the resume (0-100), scoring should be strict and criteria should include skills, ATS friendliness, and formatting.
      `,
    ],
    [
      "human",
      `
      Review the resume provided below and and provide feedback in the specified JSON format.
      
      {resume}
      `,
    ],
  ]);

  const resumeText = await convertResumeToText(resume);

  const inputMessage = await prompt.format({ resume: resumeText });

  const model = new ChatOpenAI({
    modelName: aImodel,
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
    maxConcurrency: 1,
    maxTokens: 3000,
  });

  const stream = await model
    .pipe(new StringOutputParser())
    .stream(inputMessage);

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

export const getJobMatchByOllama = async (
  resume: Resume,
  job: JobResponse,
  aiModel?: string
): Promise<ReadableStream | undefined> => {
  const resumeText = await convertResumeToText(resume);

  const jobText = await convertJobToText(job);

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `
    You are an expert assistant tasked with matching job seekers' resumes with job descriptions and providing suggestions to improve their resumes. You will analyze the given resume and job description, provide a matching score between 0 and 100, score will be based on application tracking system (ATS) friendliness and skill and keywords match, and suggest improvements to increase the matching score and make the resume more aligned with the job description. Be verbose and highlight details in your response.
    
    Your response must always return JSON object with following structure:

        "detailed_analysis": an array list of following object structures:
              <<object structure>>
                "category": "suggestion category title with score",
                "value": "an array list of suggestion as strings",
              <<example 1>>
                "category": "ATS Friendliness(60/100):",
                "value": ["<ATS friendliness analysis 1>", "<ATS friendliness analysis 2>",...],
              <<example 2>>
                "category": "Skill and Keyword match(65/100):",
                "value": ["<description of analysis in terms of skill match>", "<description of analysis in terms of keyword match>",...],
        "suggestions": an array list with following object structures:
              <<object structure>>
                "category": "suggestion category title",
                "value": "an array list of suggestion as strings",
              <<example 1>>
                "category": "Emphasize Keywords and Skills:",
                "value": ["<missing keywords not found in resume>", "<missing skill not found in resume>",...],
              <<example 2>>
                "category": "Format for clarity and ATS optimization:",
                "value": ["<change 1>", "<change 2>",...],
              <<example 3>>
                "category": "Enhancement for relevant experience:",
                "value": ["<change 1>", "<change 2>",...],
        "additional_comments": summary of recommendations as array of strings.
              <<example>>
                ["<comments>"],
        "matching_score": <matching_score with single numeric value, be strict with this score with always room for improvement>,
  `,
    ],
    [
      "human",
      `
      Please analyze the following resume and job description.

      Resume:
      """
      {resume}
      """

      Job Description:
      """
      {job_description}
      """
    `,
    ],
  ]);

  const inputMessage = await prompt.format({
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

  const stream = await model
    .pipe(new StringOutputParser())
    .stream(inputMessage);
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

export const getJobMatchByOpenAi = async (
  resume: Resume,
  job: JobResponse,
  aiModel?: string
): Promise<ReadableStream | undefined> => {
  const resumeText = await convertResumeToText(resume);

  const jobText = await convertJobToText(job);

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `
    You are an expert assistant tasked with matching job seekers' resumes with job descriptions and providing suggestions to improve their resumes. You will analyze the given resume and job description, provide a matching score between 0 and 100, score will be based on application tracking system (ATS) friendliness and skill and keywords match, and suggest improvements to increase the matching score and make the resume more aligned with the job description. Be verbose and highlight details in your response.
    
    Your response must always return JSON object with following structure:

        "detailed_analysis": an array list of following object structures:
              <<object structure>>
                "category": "suggestion category title with score",
                "value": "an array list of suggestion as strings",
              <<example 1>>
                "category": "ATS Friendliness(60/100):",
                "value": ["<ATS friendliness analysis 1>", "<ATS friendliness analysis 2>",...],
              <<example 2>>
                "category": "Skill and Keyword match(65/100):",
                "value": ["<description of analysis in terms of skill match>", "<description of analysis in terms of keyword match>",...],
        "suggestions": an array list with following object structures:
              <<object structure>>
                "category": "suggestion category title",
                "value": "an array list of suggestion as strings",
              <<example 1>>
                "category": "Emphasize Keywords and Skills:",
                "value": ["<missing keywords not found in resume>", "<missing skill not found in resume>",...],
              <<example 2>>
                "category": "Format for clarity and ATS optimization:",
                "value": ["<change 1>", "<change 2>",...],
              <<example 3>>
                "category": "Enhancement for relevant experience:",
                "value": ["<change 1>", "<change 2>",...],
        "additional_comments": summary of recommendations as array of strings.
              <<example>>
                ["<comments>"],
        "matching_score": <matching_score with single numeric value, be strict with this score with always room for improvement>,
  `,
    ],
    [
      "human",
      `
      Please analyze the following resume and job description.

      Resume:
      """
      {resume}
      """

      Job Description:
      """
      {job_description}
      """
    `,
    ],
  ]);

  const inputMessage = await prompt.format({
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

  const stream = await model
    .pipe(new StringOutputParser())
    .stream(inputMessage);
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
