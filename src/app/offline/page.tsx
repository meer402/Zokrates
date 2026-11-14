import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline · Zokrates" };

export default function Offline() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
      <h1 className="font-display text-3xl">You are offline</h1>
      <p className="max-w-xs text-marble-dim">
        Zokrates needs a connection to answer. Your conversation is saved on this device and
        will be here when you are back.
      </p>
      {/* A full page load, so the service worker retries the network. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="mt-2 rounded-full bg-ochre px-5 py-2.5 font-medium text-ochre-ink">
        Try again
      </a>
    </main>
  );
}
