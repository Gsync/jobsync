import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import db from "@/lib/db";
import { automationLogger } from "@/lib/automation-logger";

function createSSEErrorResponse(message: string): NextResponse {
  const encoder = new TextEncoder();
  const errorData = JSON.stringify({ logs: [], isRunning: false, error: message });
  const body = encoder.encode(`data: ${errorData}\n\n`);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const userId = session?.accessToken?.sub;

  if (!session || !session.user || !userId) {
    return createSSEErrorResponse("Not Authenticated");
  }

  const { id: automationId } = await params;

  // Verify ownership
  const automation = await db.automation.findFirst({
    where: {
      id: automationId,
      userId,
    },
  });

  if (!automation) {
    return createSSEErrorResponse("Automation not found");
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;

      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        clearInterval(interval);
        clearTimeout(timeout);
        controller.close();
      };

      // Send initial logs
      const store = automationLogger.getStore(automationId);
      if (store) {
        const initialData = JSON.stringify({
          logs: store.logs,
          isRunning: store.isRunning,
          startedAt: store.startedAt,
          completedAt: store.completedAt,
        });
        controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));
      } else {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ logs: [], isRunning: false })}\n\n`,
          ),
        );
      }

      // Poll for new logs every second
      const interval = setInterval(() => {
        if (isClosed) return;
        const currentStore = automationLogger.getStore(automationId);
        if (currentStore) {
          const data = JSON.stringify({
            logs: currentStore.logs,
            isRunning: currentStore.isRunning,
            startedAt: currentStore.startedAt,
            completedAt: currentStore.completedAt,
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));

          // Stop streaming if run is completed
          if (!currentStore.isRunning && currentStore.completedAt) {
            cleanup();
          }
        }
      }, 1000);

      // Cleanup on client disconnect
      req.signal.addEventListener("abort", cleanup);

      // Auto-close after 10 minutes
      const timeout = setTimeout(cleanup, 10 * 60 * 1000);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
