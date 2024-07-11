import "server-only";

import { auth } from "@/auth";
import { NextApiRequest, NextApiResponse } from "next";
import { getResumeReviewByAi } from "@/actions/ai.actions";
import { NextResponse } from "next/server";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export const GET = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await auth();
  console.log("SESSION USER: ", session?.user);
  const userId = session?.accessToken.sub;

  if (!session || !session.user) {
    return res.status(401).json({ message: "Not Authenticated" });
  }

  //   const { label, value } = await req.body();
  //   if (!value) {
  //     return res.status(400).json({ message: "Input text is required" });
  //   }

  try {
    const readableStream = await getResumeReviewByAi();

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message = "Error getting AI response.";
    console.error(message, error);
    if (error instanceof Error) {
      if (error.message === "fetch failed") {
        error.message =
          "Fetch failed, please make sure selected AI service is running.";
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500, statusText: error.message }
      );
    }
    return NextResponse.json(
      { error: message },
      { status: 500, statusText: message }
    );
  }
};
