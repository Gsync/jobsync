"use server";

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";

import { handleError } from "@/lib/utils";

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

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert translator. Format all responses as JSON objects with two keys: "original" and "translated".`,
    ],
    ["human", `Translate "{input}" into {language}.`],
  ]);

  const model = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: "llama3",
    format: "json",
  });

  try {
    //  const response = await model.invoke(messages);

    const chain = prompt.pipe(model);

    const response = await chain.invoke({
      input: "I love programming",
      language: "German",
    });
    return { response, success: true };
  } catch (error) {
    const msg = "Failed to review resume.";
    return handleError(error, msg);
  }
};
