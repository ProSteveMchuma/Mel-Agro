"use client";

import { useState } from "react";

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website: form.get("website") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "We could not complete your subscription.");

      setStatus("success");
      setMessage(result.message);
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Please try again shortly.");
    }
  }

  return (
    <section className="relative mx-4 mb-8 overflow-hidden rounded-[3rem] bg-gray-900 py-20 text-white md:mx-8 md:py-24" aria-labelledby="newsletter-heading">
      <div className="absolute inset-0 opacity-20" aria-hidden="true">
        <div className="absolute right-0 top-0 h-96 w-96 -translate-y-1/2 translate-x-1/2 rounded-full bg-green-500/20 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-96 w-96 -translate-x-1/2 translate-y-1/2 rounded-full bg-green-500/10 blur-[100px]" />
      </div>

      <div className="container-custom relative z-10 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 id="newsletter-heading" className="mb-5 text-4xl font-black tracking-tighter text-white md:text-5xl">Grow with Mel-Agri</h2>
          <p className="mb-9 text-base font-medium text-gray-300 md:text-lg">Get seasonal planting reminders, practical guides, and selected offers by email.</p>

          {status === "success" ? (
            <div className="mx-auto max-w-lg rounded-2xl border border-green-400/30 bg-green-400/10 p-6" role="status">
              <h3 className="font-black text-white">Subscription confirmed</h3>
              <p className="mt-1 text-sm text-gray-300">{message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mx-auto max-w-lg" noValidate>
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="newsletter-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="min-h-14 flex-grow rounded-2xl border border-white/20 bg-white/10 px-6 text-white placeholder:text-gray-400 focus:border-green-400 focus:outline-none focus:ring-4 focus:ring-green-500/20"
                  required
                  disabled={status === "submitting"}
                  aria-describedby="newsletter-feedback newsletter-privacy"
                  aria-invalid={status === "error"}
                />
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <label htmlFor="newsletter-website">Website</label>
                  <input id="newsletter-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
                </div>
                <button type="submit" disabled={status === "submitting"} className="min-h-14 rounded-2xl bg-green-500 px-8 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-green-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300/40 disabled:cursor-wait disabled:opacity-60">
                  {status === "submitting" ? "Joining…" : "Subscribe"}
                </button>
              </div>
              <p id="newsletter-feedback" className={`mt-3 min-h-5 text-sm ${status === "error" ? "text-red-300" : "text-gray-400"}`} role={status === "error" ? "alert" : undefined}>{message}</p>
              <p id="newsletter-privacy" className="mt-2 text-xs text-gray-400">You can unsubscribe at any time. We do not sell your contact information.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
