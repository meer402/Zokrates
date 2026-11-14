"use client";

import { useEffect, useRef, useState } from "react";
import { AGENT_NAME, SUGGESTIONS } from "@/lib/agent";
import type { ChatMessage } from "@/lib/chat-types";
import { useChat } from "@/lib/use-chat";

export function Chat() {
  const { messages, isStreaming, send, stop, reset } = useChat();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest text in view while it streams in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const resizeInput = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const submit = (text: string) => {
    if (!text.trim() || isStreaming) return;
    setDraft("");
    requestAnimationFrame(resizeInput);
    void send(text);
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col">
      <header className="flex items-center justify-between border-b border-ink-line px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <h1 className="font-display text-2xl tracking-tight">
          <span className="text-ochre">Z</span>okrates
        </h1>
        <button
          type="button"
          onClick={reset}
          disabled={messages.length === 0}
          className="rounded-full border border-ink-line px-3.5 py-1.5 text-sm text-marble-dim transition-colors enabled:active:bg-ink-raised disabled:opacity-40"
        >
          New chat
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 py-5">
        {messages.length === 0 ? (
          <EmptyState onPick={submit} />
        ) : (
          <ol className="flex flex-col gap-4" aria-live="polite">
            {messages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))}
          </ol>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(draft);
        }}
        className="flex items-end gap-2 border-t border-ink-line px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
      >
        <label htmlFor="message" className="sr-only">
          Message {AGENT_NAME}
        </label>
        <textarea
          id="message"
          ref={inputRef}
          value={draft}
          rows={1}
          placeholder="Ask, or be asked…"
          enterKeyHint="send"
          onChange={(event) => {
            setDraft(event.target.value);
            resizeInput();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit(draft);
            }
          }}
          // 16px text stops iOS Safari zooming the page on focus.
          className="max-h-40 flex-1 resize-none rounded-3xl border border-ink-line bg-ink-raised px-4 py-2.5 text-base leading-6 outline-none placeholder:text-marble-dim focus:border-ochre"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={stop}
            aria-label="Stop reply"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-ink-line bg-ink-raised"
          >
            <span className="size-3.5 rounded-sm bg-marble" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send message"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ochre text-ochre-ink transition-opacity disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        )}
      </form>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col justify-center gap-8">
      <div>
        <p className="font-display text-4xl leading-tight">
          What are you sure of today?
        </p>
        <p className="mt-3 text-marble-dim">
          {AGENT_NAME} answers, and asks back. Start anywhere.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <li key={suggestion}>
            <button
              type="button"
              onClick={() => onPick(suggestion)}
              className="w-full rounded-2xl border border-ink-line px-4 py-3 text-left active:bg-ink-raised"
            >
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const waiting = !isUser && message.content === "" && !message.error;

  return (
    <li className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-3xl rounded-br-md bg-ochre px-4 py-2.5 text-ochre-ink"
            : "max-w-[92%]"
        }
      >
        {waiting ? (
          <span className="flex gap-1.5 py-2" role="status" aria-label={`${AGENT_NAME} is thinking`}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="thinking-dot size-2 rounded-full bg-marble-dim"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        ) : (
          message.content && (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          )
        )}
        {message.error && (
          <p role="alert" className="mt-1.5 text-sm text-danger">
            {message.error}
          </p>
        )}
      </div>
    </li>
  );
}
