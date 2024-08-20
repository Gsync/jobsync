import "server-only";

import { auth } from "@/auth";
import { NextApiRequest, NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";
import { Resume } from "@/models/profile.model";
import { getJobMatchByOllama, getJobMatchByOpenAi } from "@/actions/ai.actions";
import { getResumeById } from "@/actions/profile.actions";
import { getJobDetails } from "@/actions/job.actions";
import { AiModel, AiProvider } from "@/models/ai.model";
import { JobResponse } from "@/models/job.model";

export const POST = async (req: NextRequest, res: NextApiResponse) => {
  const session = await auth();
  const userId = session?.accessToken.sub;

  if (!session || !session.user) {
    return res.status(401).json({ message: "Not Authenticated" });
  }
  const { resumeId, jobId, selectedModel } = (await req.json()) as {
    resumeId: string;
    jobId: string;
    selectedModel: AiModel;
  };
  try {
    if (!resumeId || !jobId || !selectedModel) {
      throw new Error("ResumeId, Job Id and selectedModel is required");
    }

    const [resume, { job }]: [Resume, { job: JobResponse }] = await Promise.all(
      [getResumeById(resumeId), getJobDetails(jobId)]
    );

    let response;
    switch (selectedModel.provider) {
      case AiProvider.OPENAI:
        response = await getJobMatchByOpenAi(resume, job, selectedModel.model);
        break;
      default:
        response = await getJobMatchByOllama(resume, job, selectedModel.model);
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
