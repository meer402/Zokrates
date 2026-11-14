import type { ChatMessage } from "./chat-types";

/**
 * The conversation lives in memory and is mirrored to localStorage so it
 * survives app restarts. Read it with useSyncExternalStore.
 */

const STORAGE_KEY = "zokrates.conversation.v1";
const EMPTY: ChatMessage[] = [];

let messages: ChatMessage[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) messages = parsed as ChatMessage[];
    }
  } catch {
    // Storage unavailable or corrupt: start with an empty conversation.
  }
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Storage full or unavailable: keep the in-memory copy.
  }
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): ChatMessage[] {
  load();
  return messages;
}

export function getServerSnapshot(): ChatMessage[] {
  return EMPTY;
}

export function setMessages(
  next: ChatMessage[] | ((current: ChatMessage[]) => ChatMessage[]),
  options: { persist?: boolean } = {},
) {
  load();
  messages = typeof next === "function" ? next(messages) : next;
  if (options.persist !== false) persist();
  for (const listener of listeners) listener();
}
