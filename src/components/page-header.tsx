import { TopicCrumb } from "@/components/topic-crumb";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  children,
  className,
  compact = false,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("border-b border-border bg-card", className)}>
      <div
        className={cn(
          "container flex flex-col gap-3 md:flex-row md:items-end md:justify-between",
          compact ? "py-4 md:py-5" : "py-6 md:py-8",
        )}
      >
        <div className={cn("space-y-2", compact && "space-y-1")}>
          {!compact && <TopicCrumb />}
          <h1
            className={cn(
              "font-serif font-bold tracking-tight text-primary",
              compact
                ? "text-2xl md:text-3xl"
                : "text-3xl md:text-4xl",
            )}
          >
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-[0.95rem]">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex shrink-0 items-center gap-2">{children}</div>
        )}
      </div>
    </div>
  );
}
