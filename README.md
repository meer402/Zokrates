# Zokrates

A mobile-first Progressive Web App for talking to a conversational agent. Built with Next.js (App Router), Tailwind CSS and the Anthropic SDK.

## Run it

```bash
cp .env.example .env.local   # then add your ANTHROPIC_API_KEY
npm install
npm run dev
```

Open http://localhost:3000. The service worker only registers in production builds:

```bash
npm run build && npm start
```

To install it on a phone the app must be served over HTTPS (or `localhost`). Deploy it, or tunnel your local server, then use "Add to Home Screen".

## Layout

| Path | What it is |
| --- | --- |
| `src/lib/agent.ts` | Agent name, system prompt, model, effort and request limits |
| `src/app/api/chat/route.ts` | Streams the model's reply as NDJSON |
| `src/lib/use-chat.ts` | Client hook: sends a turn, reads the stream, stop and reset |
| `src/lib/chat-store.ts` | Conversation state, mirrored to `localStorage` |
| `src/components/chat.tsx` | The chat screen |
| `src/app/manifest.ts` | Web app manifest |
| `public/sw.js` | Service worker: offline fallback and static asset cache |
| `src/app/offline/page.tsx` | Page shown when a navigation fails offline |

## Notes

- The API key stays on the server; the browser only talks to `/api/chat`.
- The conversation is stored on the device only. There are no accounts and no server-side history.
- `/api/chat` has no authentication or rate limiting. Add both before exposing a deployment publicly.
- Bump `CACHE` in `public/sw.js` when you change what the service worker precaches.
