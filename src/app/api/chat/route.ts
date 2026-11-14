import Anthropic from "@anthropic-ai/sdk";
import {
  EFFORT,
  MAX_MESSAGES,
  MAX_MESSAGE_CHARS,
  MAX_TOKENS,
  MODEL,
  SYSTEM_PROMPT,
} from "@/lib/agent";
import type { ChatStreamEvent } from "@/lib/chat-types";

// Reads ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) from the environment.
const client = new Anthropic();

function parseMessages(body: unknown): Anthropic.Beta.BetaMessageParam[] | null {
  if (typeof body !== "object" || body === null) return null;
  const { messages } = body as { messages?: unknown };
  if (!Array.isArray(messages) || messages.length === 0) return null;
  if (messages.length > MAX_MESSAGES) return null;

  const parsed: Anthropic.Beta.BetaMessageParam[] = [];
  for (const message of messages) {
    if (typeof message !== "object" || message === null) return null;
    const { role, content } = message as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || content.trim() === "") return null;
    if (content.length > MAX_MESSAGE_CHARS) return null;
    parsed.push({ role, content });
  }
  if (parsed[parsed.length - 1].role !== "user") return null;
  return parsed;
}

function errorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "The server's Anthropic credentials were rejected. Check ANTHROPIC_API_KEY.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Zokrates is being asked too much at once. Try again in a moment.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Could not reach the model. Check the server's network connection.";
  }
  if (err instanceof Anthropic.APIError) {
    return `The model returned an error (${err.status ?? "unknown"}).`;
  }
  return "Something went wrong while generating a reply.";
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set on the server. Add it to .env.local." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const messages = parseMessages(body);
  if (!messages) {
    return Response.json(
      { error: "Expected { messages: [{ role, content }] } ending with a user message." },
      { status: 400 },
    );
  }

  const stream = client.beta.messages.stream(
    {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      output_config: { effort: EFFORT },
      // If a safety classifier declines the request, the API re-runs it on a
      // fallback model inside the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages,
    },
    { signal: request.signal },
  );

  const encoder = new TextEncoder();
  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        stream.on("text", (text) => send({ type: "text", text }));
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          send({ type: "error", message: "Zokrates declined to answer that." });
        } else {
          send({ type: "done", stopReason: final.stop_reason });
        }
      } catch (err) {
        if (request.signal.aborted) return;
        console.error("[api/chat]", err);
        send({ type: "error", message: errorMessage(err) });
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed by a client disconnect.
        }
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body$, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
