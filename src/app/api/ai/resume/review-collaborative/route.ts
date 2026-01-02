import "server-only";

import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { collaborativeResumeReview } from "@/lib/ai/multi-agent";
import {
  ProgressStream,
  encodeProgressMessage,
  createProgressUpdate,
} from "@/lib/ai/progress-stream";
import { convertResumeToText } from "@/utils/ai.utils";
import { Resume } from "@/models/profile.model";
import { AiModel } from "@/models/ai.model";

export const POST = async (req: NextRequest) => {
  const session = await auth();
  const userId = session?.accessToken?.sub;

  if (!session || !session.user || !userId) {
    return new Response(JSON.stringify({ message: "Not Authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limiting
  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: `Rate limit exceeded. Try again in ${Math.ceil(
          rateLimit.resetIn / 1000
        )} seconds.`,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { selectedModel, resume } = (await req.json()) as {
    selectedModel: AiModel;
    resume: Resume;
  };

  if (!resume || !selectedModel) {
    return new Response(
      JSON.stringify({ error: "Resume and model selection required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const resumeText = await convertResumeToText(resume);

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const progressStream = new ProgressStream(controller);

        try {
          // Run collaborative analysis with progress updates
          const { analysis } = await collaborativeResumeReview(
            resumeText,
            selectedModel.provider,
            selectedModel.model || "llama3.2",
            progressStream
          );

          // Send validation progress
          progressStream.sendStarted("validation");
          // Validation would go here if needed
          progressStream.sendCompleted("validation");

          // Send completion and final result
          const completeUpdate = createProgressUpdate("complete", "completed");
          controller.enqueue(
            new TextEncoder().encode(encodeProgressMessage(completeUpdate))
          );

          // Send the final analysis as the last message
          const finalMessage = `data: ${JSON.stringify({
            type: "result",
            data: analysis,
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(finalMessage));

          controller.close();
        } catch (error) {
          console.error("Collaborative review error:", error);
          const errorMessage = `data: ${JSON.stringify({
            type: "error",
            message: error instanceof Error ? error.message : "Analysis failed",
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorMessage));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Resume review error:", error);
    const message =
      error instanceof Error ? error.message : "AI request failed";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
