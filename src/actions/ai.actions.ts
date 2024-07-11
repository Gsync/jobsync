"use server";

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export const getResumeReviewByAi = async (
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

  // const prompt = ChatPromptTemplate.fromMessages([
  //   [
  //     "system",
  //     `You are an expert resume writer. Format all responses as JSON objects.`,
  //   ],
  //   ["human", `Translate "{input}" into {language}.`],
  // ]);

  const model = new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: "llama3",
    // format: "json",
  });

  const stream = await model
    .pipe(new StringOutputParser())
    .stream(
      `Write a resume summary of 100 words at most for a software engineer, focusing on experience with Python and JavaScript.`
    );

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
