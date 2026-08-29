import { PageHeader } from "@/components/page-header";
import { TopicsSidebar } from "@/components/topics-nav";
import { TableOfContents } from "@/components/table-of-contents";
import { IndicatorDefinitions } from "@/components/data/indicator-definitions";
import { RelatedTopics } from "@/components/data/related-topics";
import { SourceList } from "@/components/data/source-list";
import { CiteThis } from "@/components/data/cite-this";
import { LastUpdated } from "@/components/data/last-updated";
import { CollapsibleSection } from "@/components/collapsible-section";
import { sourcesForIndicators } from "@/lib/glossary";
import { topicMeta } from "@/lib/topic-meta";

const CONTENT_ID = "topic-content";

/**
 * Shared frame for topic hub pages. `chart-first` drops sidebars and tucks
 * encyclopedia copy behind collapsible sections so maps and tables lead.
 */
export function TopicShell({
  title,
  description,
  path,
  hero,
  updatedAt,
  variant = "chart-first",
  children,
}: {
  title: string;
  description?: React.ReactNode;
  path: string;
  hero?: React.ReactNode;
  updatedAt?: Date | string | null;
  variant?: "default" | "chart-first";
  children: React.ReactNode;
}) {
  const meta = topicMeta(path);
  const indicators = meta?.indicators ?? [];
  const sources = sourcesForIndicators(indicators);
  const chartFirst = variant === "chart-first";

  const definitions =
    indicators.length > 0 || meta?.caveats?.length ? (
      <IndicatorDefinitions
        slugs={indicators}
        caveats={meta?.caveats}
        plain={chartFirst}
      />
    ) : null;

  const footer = (
    <>
      <SourceList sources={sources} plain={chartFirst} />
      {meta ? <RelatedTopics related={meta.related} plain={chartFirst} /> : null}
      <CiteThis
        title={title}
        path={path}
        sources={sources.map((s) => s.name)}
        plain={chartFirst}
      />
    </>
  );

  return (
    <div>
      <PageHeader
        title={title}
        description={chartFirst ? undefined : description}
        compact={chartFirst}
      >
        <LastUpdated date={updatedAt} />
      </PageHeader>

      {hero}

      <div className="container">
        {chartFirst ? (
          <article id={CONTENT_ID} className="min-w-0 space-y-8 py-6 md:py-8">
            {children}
            {definitions ? (
              <CollapsibleSection title="What this page measures">
                {definitions}
              </CollapsibleSection>
            ) : null}
            <CollapsibleSection title="Sources & citation">{footer}</CollapsibleSection>
          </article>
        ) : (
          <div className="grid gap-10 py-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
            <aside className="hidden lg:block">
              <div className="sticky top-20 space-y-8">
                <TableOfContents containerId={CONTENT_ID} />
                <TopicsSidebar />
              </div>
            </aside>
            <article id={CONTENT_ID} className="min-w-0 space-y-10">
              {definitions}
              {children}
              <div className="space-y-6">{footer}</div>
            </article>
          </div>
        )}
      </div>
    </div>
  );
}
