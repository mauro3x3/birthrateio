import { TopicCrumb } from "@/components/topic-crumb";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-border bg-card", className)}>
      <div className="container flex flex-col gap-3 py-6 md:flex-row md:items-end md:justify-between md:py-8">
        <div className="space-y-2">
          <TopicCrumb />
          <h1 className="font-serif text-3xl font-bold tracking-tight text-primary md:text-4xl">
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
