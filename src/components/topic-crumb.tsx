"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { topicForPath } from "@/lib/site";

/** DST-style subject trail above page titles. */
export function TopicCrumb() {
  const pathname = usePathname();
  if (pathname === "/topics" || pathname.startsWith("/topics/")) return null;

  const topic = topicForPath(pathname);
  if (!topic) return null;

  const current = topic.links.find(
    (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
  );
  if (!current) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="text-[0.8125rem] text-muted-foreground"
    >
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <li>
          <Link href="/topics" className="hover:text-foreground hover:underline">
            Topics
          </Link>
        </li>
        <li aria-hidden className="opacity-50">
          /
        </li>
        <li>
          <Link
            href={topic.href}
            className="hover:text-foreground hover:underline"
          >
            {topic.title}
          </Link>
        </li>
        <li aria-hidden className="opacity-50">
          /
        </li>
        <li className="font-medium text-foreground">{current.title}</li>
      </ol>
    </nav>
  );
}
