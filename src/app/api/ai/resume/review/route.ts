import "server-only";

import { auth } from "@/auth";
import { NextApiRequest, NextApiResponse } from "next";
import {
  getResumeReviewByOllama,
  getResumeReviewByOpenAi,
} from "@/actions/ai.actions";
import { NextRequest, NextResponse } from "next/server";
import { Resume } from "@/models/profile.model";
import { AiModel, AiProvider } from "@/models/ai.model";

export const POST = async (req: NextRequest, res: NextApiResponse) => {
  const session = await auth();
  const userId = session?.accessToken.sub;

  if (!session || !session.user) {
    return res.status(401).json({ message: "Not Authenticated" });
  }
  const { selectedModel, resume } = (await req.json()) as {
    selectedModel: AiModel;
    resume: Resume;
  };
  try {
    if (!resume || !selectedModel) {
      throw new Error("Resume or selected model is required");
    }

    let response;
    switch (selectedModel.provider) {
      case AiProvider.OPENAI:
        response = await getResumeReviewByOpenAi(resume, selectedModel.model);
        break;
      default:
        response = await getResumeReviewByOllama(resume, selectedModel.model);
        break;
    }

    return new NextResponse(response, {
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
        error.message = `Fetch failed, please make sure selected AI provider (${selectedModel.provider}) service is running.`;
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
