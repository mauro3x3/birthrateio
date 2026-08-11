"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "tfr", label: "TFR / fertility" },
  { value: "population", label: "Population" },
  { value: "migration", label: "Migration" },
  { value: "city", label: "City / metro" },
  { value: "other", label: "Other" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

export function TipForm() {
  const searchParams = useSearchParams();
  const about = searchParams.get("about")?.trim() ?? "";

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [subject, setSubject] = React.useState(about);
  const [category, setCategory] = React.useState<Category>("tfr");
  const [message, setMessage] = React.useState(
    about ? `Re: ${about}\n\n` : "",
  );
  const [status, setStatus] = React.useState<"idle" | "loading" | "ok" | "err">(
    "idle",
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!about) return;
    setSubject((s) => s || about);
    setMessage((m) => (m.trim() ? m : `Re: ${about}\n\n`));
  }, [about]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          url: url.trim() || undefined,
          subject: subject.trim() || undefined,
          category,
          message: message.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setStatus("err");
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("ok");
      setName("");
      setEmail("");
      setUrl("");
      setSubject("");
      setCategory("tfr");
      setMessage("");
    } catch {
      setStatus("err");
      setError("Network error. Please try again.");
    }
  }

  if (status === "ok") {
    return (
      <div className="space-y-4 border border-border bg-white p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[hsl(155_45%_32%)]" />
          <div className="space-y-2">
            <h2 className="font-serif text-xl font-semibold tracking-tight">
              Thanks — tip received
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We review every submission and update country or city pages when
              we can verify the source. You can send another tip anytime.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatus("idle")}
            >
              Submit another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 border border-border bg-white p-6 sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tip-name">Name (optional)</Label>
          <Input
            id="tip-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tip-email">Email (optional)</Label>
          <Input
            id="tip-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
            autoComplete="email"
            placeholder="If we need to follow up"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tip-url">
          Source URL <span className="text-muted-foreground">(preferred)</span>
        </Label>
        <Input
          id="tip-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={2000}
          placeholder="https://…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tip-subject">Country or city</Label>
          <Input
            id="tip-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            placeholder="e.g. Japan, Seoul"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tip-category">Category</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as Category)}
          >
            <SelectTrigger id="tip-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tip-message">What was released?</Label>
        <textarea
          id="tip-message"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={4000}
          rows={5}
          placeholder="Briefly describe the new figure, year, and source (e.g. “Korea Statistics released 2025 TFR = 0.75”)."
          className={cn(
            "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={status === "loading" || !message.trim()}>
        {status === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          "Submit tip"
        )}
      </Button>
    </form>
  );
}
