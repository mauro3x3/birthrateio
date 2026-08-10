"use client";

import { ExternalLink, Heart } from "lucide-react";
import { supportConfig } from "@/lib/site";
import { Button } from "@/components/ui/button";

export function SupportDonate() {
  const href = supportConfig.donationUrl.trim();

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: supportConfig.currency,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        Donations go through{" "}
        <strong className="font-medium text-foreground">
          {supportConfig.providerName}
        </strong>
        . Pick any amount there — one-time gifts or a monthly membership both
        help. Typical gifts are {fmt(5)}–{fmt(25)}.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {supportConfig.suggestedAmounts.map((n) => (
          <span
            key={n}
            className="min-w-[4.5rem] rounded-lg border bg-muted/40 px-4 py-2.5 text-center text-sm font-semibold tabular-nums text-muted-foreground"
          >
            {fmt(n)}
          </span>
        ))}
      </div>

      {href ? (
        <Button asChild size="lg" className="w-full sm:w-auto">
          <a href={href} target="_blank" rel="noopener noreferrer">
            <Heart className="mr-2 h-4 w-4" />
            Donate on {supportConfig.providerName}
            <ExternalLink className="ml-2 h-4 w-4 opacity-70" />
          </a>
        </Button>
      ) : (
        <div className="space-y-2">
          <Button size="lg" disabled className="w-full sm:w-auto">
            <Heart className="mr-2 h-4 w-4" />
            Donate
          </Button>
          <p className="text-xs text-muted-foreground">
            Set{" "}
            <code className="rounded bg-muted px-1">
              NEXT_PUBLIC_DONATION_URL
            </code>{" "}
            to your Buy Me a Coffee, Ko-fi, Stripe Payment Link, or PayPal URL.
          </p>
        </div>
      )}
    </div>
  );
}
