import "server-only";

import { auth } from "@/auth";
import { getResumeReview } from "@/actions/ai.actions";
import { NextRequest, NextResponse } from "next/server";
import { Resume } from "@/models/profile.model";
import { AiModel, AiProvider } from "@/models/ai.model";

export const POST = async (req: NextRequest) => {
  const session = await auth();
  const userId = session?.accessToken.sub;

  if (!session || !session.user) {
    return NextResponse.json({ message: "Not Authenticated" }, { status: 401 });
  }
  const { selectedModel, resume } = (await req.json()) as {
    selectedModel: AiModel;
    resume: Resume;
  };
  try {
    if (!resume || !selectedModel) {
      throw new Error("Resume or selected model is required");
    }

    const modelType =
      selectedModel.provider === AiProvider.OPENAI ? "openai" : "ollama";
    const response = await getResumeReview(
      resume,
      modelType,
      selectedModel.model
    );

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
