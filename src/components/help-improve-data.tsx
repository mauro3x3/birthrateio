import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Replacement Clock–style prompt: sit next to sources so corrections are
 * one click away instead of buried under Topics → Tools.
 */
export function HelpImproveData({
  className,
  context,
}: {
  className?: string;
  /** Optional chart/page context prefilled into the tip form subject. */
  context?: string;
}) {
  const href = context
    ? `/contribute?about=${encodeURIComponent(context)}`
    : "/contribute";

  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      Have a correction, a better estimate, or additional data—at the global,
      national, regional, or city level?{" "}
      <Link
        href={href}
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        Help improve the data
      </Link>
    </p>
  );
}

/** Source line + contribute prompt, for chart/map footers. */
export function SourceWithContribute({
  source,
  context,
  className,
}: {
  source: string;
  context?: string;
  className?: string;
}) {
  return (
    <div className={cn("mt-3 space-y-1.5", className)}>
      <p className="text-xs text-muted-foreground">Source: {source}</p>
      <HelpImproveData context={context} />
    </div>
  );
}
