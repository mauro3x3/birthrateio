"use client";

import * as React from "react";
import { ExternalLink, Heart } from "lucide-react";
import { supportConfig } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Frequency = "once" | "monthly";

export function SupportDonate() {
  const [amount, setAmount] = React.useState<number>(
    supportConfig.suggestedAmounts[1] ?? 10,
  );
  const [frequency, setFrequency] = React.useState<Frequency>("once");
  const [custom, setCustom] = React.useState("");

  const customNum = Number(custom);
  const selected =
    custom.trim() !== "" && Number.isFinite(customNum) && customNum > 0
      ? customNum
      : amount;

  const donateHref = React.useMemo(() => {
    const base = supportConfig.donationUrl.trim();
    if (!base) return "";
    const url = new URL(base);
    url.searchParams.set("amount", String(Math.round(selected)));
    if (frequency === "monthly") {
      url.searchParams.set("frequency", "monthly");
    }
    return url.toString();
  }, [selected, frequency]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: supportConfig.currency,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
      <div className="mb-6 flex flex-wrap gap-2">
        {(["once", "monthly"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFrequency(f)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              frequency === f
                ? "border-primary bg-primary/10 text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted",
            )}
          >
            {f === "once" ? "Give once" : "Give monthly"}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {frequency === "once"
          ? "Choose an amount (USD). Every gift helps."
          : "Monthly support keeps servers and data pipelines running year-round."}
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {supportConfig.suggestedAmounts.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setAmount(n);
              setCustom("");
            }}
            className={cn(
              "min-w-[4.5rem] rounded-lg border px-4 py-2.5 text-sm font-semibold tabular-nums transition-colors",
              custom === "" && amount === n
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {fmt(n)}
          </button>
        ))}
      </div>

      <label className="mb-6 block text-sm">
        <span className="mb-1.5 block text-muted-foreground">
          Or enter another amount
        </span>
        <div className="relative max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            $
          </span>
          <input
            type="number"
            min={1}
            step={1}
            placeholder="Other"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="w-full rounded-lg border bg-background py-2.5 pl-7 pr-3 text-sm tabular-nums outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </label>

      {donateHref ? (
        <Button asChild size="lg" className="w-full sm:w-auto">
          <a href={donateHref} target="_blank" rel="noopener noreferrer">
            <Heart className="mr-2 h-4 w-4" />
            Donate {fmt(selected)}
            {frequency === "monthly" ? " / month" : ""}
            <ExternalLink className="ml-2 h-4 w-4 opacity-70" />
          </a>
        </Button>
      ) : (
        <div className="space-y-2">
          <Button size="lg" disabled className="w-full sm:w-auto">
            <Heart className="mr-2 h-4 w-4" />
            Donate {fmt(selected)}
          </Button>
          <p className="text-xs text-muted-foreground">
            Set <code className="rounded bg-muted px-1">NEXT_PUBLIC_DONATION_URL</code>{" "}
            to your Ko-fi, Stripe Payment Link, or PayPal URL to enable donations.
          </p>
        </div>
      )}
    </div>
  );
}
