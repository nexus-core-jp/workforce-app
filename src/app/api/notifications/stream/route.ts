import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { toSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = toSessionUser(session.user as Record<string, unknown>);
  if (!user) {
    return new Response("Invalid session", { status: 401 });
  }

  const { tenantId, id: userId } = user;
  const encoder = new TextEncoder();

  let interval: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let lastUnread = -1;

      const pushUnread = async () => {
        try {
          const unreadCount = await prisma.notification.count({
            where: { tenantId, userId, read: false },
          });
          if (unreadCount !== lastUnread) {
            lastUnread = unreadCount;
            controller.enqueue(encoder.encode(sseFrame("unread", { unreadCount })));
          }
        } catch {
          if (!stopped) {
            controller.enqueue(encoder.encode(sseFrame("error", { message: "notification stream failed" })));
          }
        }
      };

      controller.enqueue(encoder.encode(`retry: 10000\n\n`));
      await pushUnread();
      interval = setInterval(pushUnread, 15000);
    },
    cancel() {
      stopped = true;
      if (interval) clearInterval(interval);
      interval = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
