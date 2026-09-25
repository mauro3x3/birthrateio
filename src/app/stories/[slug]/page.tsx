import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StoryRacePlayer } from "@/components/stories/story-race-player";
import { TopicShell } from "@/components/topic-shell";
import {
  getStoryMeta,
  getStoryPack,
  STORY_CATALOG,
} from "@/lib/stories";

export const revalidate = 86400;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return STORY_CATALOG.filter((s) => s.status === "live").map((s) => ({
    slug: s.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const meta = getStoryMeta(slug);
  const pack = getStoryPack(slug);
  if (!meta || !pack) {
    return { title: "Story", robots: { index: false, follow: true } };
  }
  return {
    title: `${pack.title} — Stories`,
    description: pack.subtitle,
    alternates: { canonical: `/stories/${pack.slug}` },
  };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const meta = getStoryMeta(slug);
  const pack = getStoryPack(slug);
  if (!meta || meta.status !== "live" || !pack) notFound();

  return (
    <TopicShell
      title={pack.title}
      path={`/stories/${pack.slug}`}
      description={pack.subtitle}
      intro={
        <>
          <p>{pack.note}</p>
          <p className="text-sm text-muted-foreground">
            Source:{" "}
            <a
              href={pack.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {pack.source}
            </a>
            .{" "}
            <Link href="/stories" className="underline underline-offset-2">
              All stories
            </Link>
            .
          </p>
        </>
      }
    >
      <StoryRacePlayer pack={pack} />
    </TopicShell>
  );
}
