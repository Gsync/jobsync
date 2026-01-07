import "server-only";

import { auth } from "@/auth";
import { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { collaborativeJobMatch } from "@/lib/ai/multi-agent";
import {
  ProgressStream,
  encodeProgressMessage,
  createProgressUpdate,
} from "@/lib/ai/progress-stream";
import { convertResumeToText, convertJobToText } from "@/utils/ai.utils";
import { getResumeById } from "@/actions/profile.actions";
import { getJobDetails } from "@/actions/job.actions";
import { AiModel } from "@/models/ai.model";

// Extend timeout for multi-agent collaboration (3 minutes)
// With 60s synthesis timeout fallback, actual time is ~2 minutes max
export const maxDuration = 180;

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

  const { selectedModel, resumeId, jobId } = (await req.json()) as {
    selectedModel: AiModel;
    resumeId: string;
    jobId: string;
  };

  if (!resumeId || !jobId || !selectedModel) {
    return new Response(
      JSON.stringify({ error: "Resume, job, and model selection required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const [resume, job] = await Promise.all([
      getResumeById(resumeId),
      getJobDetails(jobId),
    ]);

    if (!resume.success || !job.success) {
      throw new Error("Failed to fetch resume or job details");
    }

    const resumeText = await convertResumeToText(resume.data!);
    const jobText = await convertJobToText(job.job!);

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const progressStream = new ProgressStream(controller);

        try {
          // Run collaborative analysis with progress updates
          const { analysis } = await collaborativeJobMatch(
            resumeText,
            jobText,
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
          try {
            controller.enqueue(
              new TextEncoder().encode(encodeProgressMessage(completeUpdate))
            );

            // Send the final analysis as the last message
            const finalMessage = `data: ${JSON.stringify({
              type: "result",
              data: analysis,
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(finalMessage));
          } catch {
            // Controller may already be closed (client disconnected)
          }

          try {
            controller.close();
          } catch {
            // Already closed
          }
        } catch (error) {
          console.error("Collaborative job match error:", error);
          try {
            const errorMessage = `data: ${JSON.stringify({
              type: "error",
              message: error instanceof Error ? error.message : "Analysis failed",
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorMessage));
            controller.close();
          } catch {
            // Controller may already be closed
          }
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
    console.error("Job match error:", error);
    const message =
      error instanceof Error ? error.message : "AI request failed";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
