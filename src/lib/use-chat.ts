"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, setMessages, subscribe } from "./chat-store";
import type { ChatMessage, ChatStreamEvent } from "./chat-types";

const newId = () => crypto.randomUUID();

/** Reads the NDJSON reply stream, calling onEvent for each line. */
async function readEvents(response: Response, onEvent: (event: ChatStreamEvent) => void) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
      if (line) onEvent(JSON.parse(line) as ChatStreamEvent);
    }
  }
}

export function useChat() {
  const messages = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || abortRef.current) return;

    const replyId = newId();
    const history = [
      // A failed reply with no text is not part of the conversation.
      ...getSnapshot().filter((m) => m.content !== ""),
      { id: newId(), role: "user", content } satisfies ChatMessage,
    ];
    setMessages([...history, { id: replyId, role: "assistant", content: "" }]);

    const patchReply = (patch: (reply: ChatMessage) => ChatMessage, persist = false) =>
      setMessages((current) => current.map((m) => (m.id === replyId ? patch(m) : m)), {
        persist,
      });

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Request failed (${response.status}).`);
      }
      await readEvents(response, (event) => {
        if (event.type === "text") {
          patchReply((m) => ({ ...m, content: m.content + event.text }));
        } else if (event.type === "error") {
          patchReply((m) => ({ ...m, error: event.message }));
        } else if (event.stopReason === "max_tokens") {
          patchReply((m) => ({ ...m, error: "The reply was cut off at the length limit." }));
        }
      });
    } catch (err) {
      if (!controller.signal.aborted) {
        const message = navigator.onLine
          ? err instanceof Error
            ? err.message
            : "Something went wrong."
          : "You are offline. Reconnect and try again.";
        patchReply((m) => ({ ...m, error: message }));
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
      // Persist the finished reply; drop it if it was stopped before any text.
      setMessages((current) =>
        current.filter((m) => m.id !== replyId || m.content !== "" || m.error),
      );
    }
  }, []);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
  }, []);

  return { messages, isStreaming, send, stop, reset };
}
