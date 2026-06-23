import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/logs/proxy
 * Proxies the Server-Sent Events stream from the VPS render engine's
 * /logs/stream endpoint to the browser client.
 */
export async function GET() {
  const workerUrl = process.env.RENDER_ENGINE_URL ?? "http://127.0.0.1:8000";

  try {
    const upstream = await fetch(`${workerUrl}/logs/stream`, {
      headers: { Accept: "text/event-stream" },
      // @ts-ignore — node-fetch/undici signal
      signal: AbortSignal.timeout(120_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Worker stream unavailable: ${upstream.status}` },
        { status: 502 }
      );
    }

    // Pipe the upstream ReadableStream directly to the response
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    // Return a synthetic SSE error event so the client doesn't hang
    const errorBody = `data: {"type":"error","message":"${err.message}"}\n\n`;
    return new Response(errorBody, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  }
}
