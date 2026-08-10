"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { navTopics, type NavTopic } from "@/lib/site";
import { cn } from "@/lib/utils";

function topicMatches(topic: NavTopic, pathname: string, hash: string) {
  if (hash && topic.id === hash) return true;
  return topic.links.some(
    (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
  );
}

export function TopicsSidebar({
  className,
  defaultOpenId,
}: {
  className?: string;
  defaultOpenId?: string;
}) {
  const pathname = usePathname();
  const [hash, setHash] = React.useState("");
  const activeTopic =
    navTopics.find((t) => topicMatches(t, pathname, hash)) ??
    navTopics.find((t) => t.id === defaultOpenId) ??
    navTopics[0];

  const [openId, setOpenId] = React.useState(activeTopic?.id ?? "people");

  React.useEffect(() => {
    const sync = () => setHash(window.location.hash.replace(/^#/, ""));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  React.useEffect(() => {
    const match = navTopics.find((t) => topicMatches(t, pathname, hash));
    if (match) setOpenId(match.id);
  }, [pathname, hash]);

  return (
    <nav
      aria-label="Topics"
      className={cn("space-y-1 text-sm", className)}
    >
      <Link
        href="/topics"
        className="mb-3 inline-flex text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Statistics by topic
      </Link>
      <ul className="space-y-0.5">
        {navTopics.map((topic) => {
          const open = openId === topic.id;
          const sectionActive = topicMatches(topic, pathname, hash);
          return (
            <li key={topic.id} className="border-b border-border/70 last:border-0">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? "" : topic.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 py-2.5 text-left font-medium transition-colors",
                  sectionActive
                    ? "text-primary"
                    : "text-foreground hover:text-primary",
                )}
              >
                <span>{topic.title}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    open && "rotate-180",
                  )}
                />
              </button>
              {open && (
                <ul className="space-y-1 pb-3 pl-0.5">
                  {topic.links.map((link) => {
                    const active =
                      pathname === link.href ||
                      pathname.startsWith(`${link.href}/`);
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className={cn(
                            "block py-0.5 transition-colors",
                            active
                              ? "font-medium text-foreground"
                              : "text-primary hover:underline",
                          )}
                        >
                          {link.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TopicsLinkGrid({ topic }: { topic: NavTopic }) {
  return (
    <section id={topic.id} className="scroll-mt-24">
      <h2 className="font-serif text-xl font-semibold text-primary">
        <Link
          href={topic.href}
          className="inline-flex items-center gap-1.5 hover:underline"
        >
          {topic.title}
          <span aria-hidden className="text-base font-normal">
            →
          </span>
        </Link>
      </h2>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        {topic.description}
      </p>
      <ul className="mt-4 space-y-2">
        {topic.links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-[0.9375rem] font-medium text-primary hover:underline"
            >
              {link.title}
            </Link>
            {link.description ? (
              <p className="text-sm text-muted-foreground">{link.description}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
