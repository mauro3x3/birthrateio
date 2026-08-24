import { PageHeader } from "@/components/page-header";
import { TopicsSidebar } from "@/components/topics-nav";
import { TableOfContents } from "@/components/table-of-contents";
import { IndicatorDefinitions } from "@/components/data/indicator-definitions";
import { RelatedTopics } from "@/components/data/related-topics";
import { SourceList } from "@/components/data/source-list";
import { CiteThis } from "@/components/data/cite-this";
import { LastUpdated } from "@/components/data/last-updated";
import { sourcesForIndicators } from "@/lib/glossary";
import { topicMeta } from "@/lib/topic-meta";

const CONTENT_ID = "topic-content";

/**
 * Shared frame for every topic hub: subject sidebar, in-page contents,
 * definitions, sources, related topics, and a citation block. `hero` renders
 * full-bleed above the two-column grid so full-width maps still work.
 */
export function TopicShell({
  title,
  description,
  path,
  hero,
  updatedAt,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  /** Hub path; also the key into the topic metadata registry. */
  path: string;
  hero?: React.ReactNode;
  updatedAt?: Date | string | null;
  children: React.ReactNode;
}) {
  const meta = topicMeta(path);
  const indicators = meta?.indicators ?? [];
  const sources = sourcesForIndicators(indicators);

  return (
    <div>
      <PageHeader title={title} description={description}>
        <LastUpdated date={updatedAt} />
      </PageHeader>

      {hero}

      <div className="container">
        <div className="grid gap-10 py-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-8">
              <TableOfContents containerId={CONTENT_ID} />
              <TopicsSidebar />
            </div>
          </aside>

          <article id={CONTENT_ID} className="min-w-0 space-y-10">
            {indicators.length > 0 || meta?.caveats?.length ? (
              <IndicatorDefinitions
                slugs={indicators}
                caveats={meta?.caveats}
              />
            ) : null}

            {children}

            <div className="space-y-6">
              <SourceList sources={sources} />
              {meta ? <RelatedTopics related={meta.related} /> : null}
              <CiteThis
                title={title}
                path={path}
                sources={sources.map((s) => s.name)}
              />
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
