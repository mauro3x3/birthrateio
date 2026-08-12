"use client";

import { CircleHelp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TFR_DECLINE_INTRO,
  TFR_DECLINE_SECTIONS,
  TFR_DECLINE_SOURCE,
} from "@/lib/fertility-decline";
import { cn } from "@/lib/utils";

/**
 * Compact “Why is TFR declining?” control — opens a sourced explainer dialog.
 * Place next to fertility chart titles / map headlines.
 */
export function WhyTfrDeclining({
  className,
  label = "Why is TFR declining?",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm text-left text-xs font-medium text-muted-foreground transition-colors hover:text-primary",
            className,
          )}
          aria-label={label}
        >
          <CircleHelp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="underline-offset-2 hover:underline">{label}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(85vh,40rem)] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl tracking-tight">
            Why is TFR declining?
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {TFR_DECLINE_INTRO}
          </DialogDescription>
        </DialogHeader>

        <ol className="mt-2 space-y-4">
          {TFR_DECLINE_SECTIONS.map((section, i) => (
            <li key={section.title} className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">
                <span className="mr-2 font-mono text-xs text-muted-foreground">
                  {i + 1}.
                </span>
                {section.title}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {section.body}
              </p>
            </li>
          ))}
        </ol>

        <p className="border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          Summary based on{" "}
          <a
            href={TFR_DECLINE_SOURCE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {TFR_DECLINE_SOURCE.author} ({TFR_DECLINE_SOURCE.year}).{" "}
            {TFR_DECLINE_SOURCE.title}
          </a>
          . {TFR_DECLINE_SOURCE.journal}. DOI:{" "}
          <span className="font-mono">{TFR_DECLINE_SOURCE.doi}</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
