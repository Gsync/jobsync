import "server-only";

import { auth } from "@/auth";
import { NextApiRequest, NextApiResponse } from "next";
import { getResumeReviewByAi } from "@/actions/ai.actions";
import { NextRequest, NextResponse } from "next/server";
import { Resume } from "@/models/profile.model";

export const POST = async (req: NextRequest, res: NextApiResponse) => {
  const session = await auth();
  const userId = session?.accessToken.sub;

  if (!session || !session.user) {
    return res.status(401).json({ message: "Not Authenticated" });
  }
  try {
    if (!req.body) {
      throw new Error("Resume is required");
    }
    const resume = (await req.json()) as Resume;

    const response = await getResumeReviewByAi(resume);

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
        error.message =
          "Fetch failed, please make sure selected AI provider service is running.";
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
