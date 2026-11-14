export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Set on an assistant message whose reply failed or was cut short. */
  error?: string;
}

/** One line of the NDJSON stream sent by POST /api/chat. */
export type ChatStreamEvent =
  | { type: "text"; text: string }
  | { type: "done"; stopReason: string | null }
  | { type: "error"; message: string };
