"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AssistantChart, type AssistantChartSpec } from "@/components/assistant-chart";

interface LinkSuggestion {
  label: string;
  href: string;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  chart?: AssistantChartSpec | null;
  links?: LinkSuggestion[];
  error?: boolean;
}

const STARTERS = [
  "What will world demographics look like racially in 2100?",
  "Compare fertility in South Korea, Japan and France",
  "Which countries have the largest diasporas?",
  "Project Italy if fertility falls to 1.2",
];

export function AssistantWidget() {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;
    setInput("");
    const history = [...messages, { role: "user" as const, content: question }];
    setMessages(history);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.error ?? "Something went wrong.",
            error: true,
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.caption ?? data.answer ?? "",
            chart: data.chart ?? null,
            links: data.links,
          },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "I couldn't reach the server. Please try again.",
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition hover:opacity-90"
          aria-label="Ask Cohort, the demographic assistant"
        >
          <Sparkles className="h-5 w-5" />
          <span className="hidden sm:inline">Ask Cohort</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[min(640px,85vh)] w-[min(440px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="font-serif text-sm font-semibold leading-none">
                  Cohort
                </p>
                <p className="text-xs text-muted-foreground">Demographic guide</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ask about population, fertility, migration, diasporas or the
                  economy and I&apos;ll build a chart you can download and share.
                </p>
                <div className="flex flex-col gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-lg border border-dashed px-3 py-2 text-left text-sm text-muted-foreground transition hover:border-solid hover:bg-accent hover:text-foreground"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {m.content}
                    </p>
                  </div>
                </div>
              ) : (
                <div key={i} className="space-y-2.5">
                  {m.content && (
                    <div className="flex justify-start">
                      <div
                        className={cn(
                          "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm",
                          m.error
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted",
                        )}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {m.content}
                        </p>
                      </div>
                    </div>
                  )}
                  {m.chart && <AssistantChart spec={m.chart} />}
                  {m.links && m.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.links.map((l, j) => (
                        <Link
                          key={j}
                          href={l.href}
                          onClick={() => setOpen(false)}
                          className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-border transition hover:bg-primary hover:text-primary-foreground"
                        >
                          {l.label} →
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about any country or trend…"
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
