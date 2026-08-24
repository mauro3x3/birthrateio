"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { navTopics, primaryNav, referenceNav } from "@/lib/site";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/global-search";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function pathActive(pathname: string, href: string) {
  if (href.includes("#")) {
    const base = href.split("#")[0];
    return pathname === base || pathname.startsWith(`${base}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Prefer the current country page when linking to country anchors like #economy. */
function resolveTopicHref(href: string, pathname: string) {
  if (!href.startsWith("/country/")) return href;
  if (!href.includes("#economy") && !href.includes("#trade")) return href;
  const match = pathname.match(/^\/country\/([^/]+)/);
  if (match) return `/country/${match[1]}#economy`;
  return href;
}

function scrollToHash(href: string) {
  const hash = href.includes("#") ? href.split("#")[1] : null;
  if (!hash) return false;
  const el = document.getElementById(hash);
  if (!el) return false;
  // Country profiles show one panel at a time; the panel switcher listens for
  // hash changes, so scrolling a hidden panel would be a no-op.
  if (el.hasAttribute("data-country-panel")) {
    if (window.location.hash === `#${hash}`) {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    } else {
      window.location.hash = hash;
    }
    return true;
  }
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [mobileTopic, setMobileTopic] = React.useState<string | null>("people");

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const topicsOpen =
    pathname.startsWith("/topics") ||
    navTopics.some((t) =>
      t.links.some(
        (l) => pathname === l.href || pathname.startsWith(`${l.href}/`),
      ),
    );

  return (
    <header className="site-header sticky top-0 z-40 w-full">
      <div className="container flex h-[3.75rem] items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="birthrate.io logo"
            width={32}
            height={32}
            priority
            className="h-8 w-8 object-contain"
          />
          <span className="hidden font-serif text-[1.05rem] font-semibold leading-tight text-white sm:block">
            birthrate<span className="font-normal opacity-90">.io</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "inline-flex items-center gap-1 rounded-sm px-2.5 py-2 text-[0.8125rem] font-medium outline-none transition-colors",
                topicsOpen
                  ? "text-white"
                  : "text-white/75 hover:text-white",
              )}
            >
              Topics
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[min(36rem,calc(100vw-2rem))] p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <DropdownMenuLabel className="p-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Browse by subject
                </DropdownMenuLabel>
                <Link
                  href="/topics"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  All topics →
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {navTopics.map((topic) => (
                  <div key={topic.id} className="rounded-sm bg-muted/50 p-2.5">
                    <p className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      {topic.title}
                    </p>
                    <ul className="space-y-0.5">
                      {topic.links.map((link) => {
                        const href = resolveTopicHref(link.href, pathname);
                        return (
                          <li key={link.href}>
                            <DropdownMenuItem
                              asChild
                              className="cursor-pointer px-2 py-1.5"
                            >
                              <Link
                                href={href}
                                onClick={(e) => {
                                  const base = href.split("#")[0];
                                  if (
                                    href.includes("#") &&
                                    pathname === base &&
                                    scrollToHash(href)
                                  ) {
                                    e.preventDefault();
                                  }
                                }}
                              >
                                {link.title}
                              </Link>
                            </DropdownMenuItem>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-1 pt-2.5">
                <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  About the data
                </span>
                {referenceNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {primaryNav
            .filter((item) => item.title !== "Topics")
            .map((item) => {
              const active = pathActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-2.5 py-2 text-[0.8125rem] font-medium transition-colors",
                    active ? "text-white" : "text-white/75 hover:text-white",
                  )}
                >
                  {item.title}
                </Link>
              );
            })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <GlobalSearch variant="header" />
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 md:hidden"
            aria-label="Menu"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 md:hidden">
          <nav className="container max-h-[min(70vh,32rem)] space-y-1 overflow-y-auto py-3">
            <Link
              href="/topics"
              className="block rounded-sm px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              All topics
            </Link>
            {navTopics.map((topic) => {
              const open = mobileTopic === topic.id;
              return (
                <div key={topic.id} className="rounded-sm">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm font-medium text-white/90 hover:bg-white/10"
                    onClick={() => setMobileTopic(open ? null : topic.id)}
                    aria-expanded={open}
                  >
                    {topic.title}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 opacity-70 transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                  {open && (
                    <ul className="mb-1 space-y-0.5 pb-1 pl-2">
                      {topic.links.map((link) => {
                        const href = resolveTopicHref(link.href, pathname);
                        return (
                          <li key={link.href}>
                            <Link
                              href={href}
                              className={cn(
                                "block rounded-sm px-3 py-1.5 text-sm transition-colors hover:bg-white/10",
                                pathActive(pathname, href)
                                  ? "text-white"
                                  : "text-white/70",
                              )}
                              onClick={(e) => {
                                const base = href.split("#")[0];
                                if (
                                  href.includes("#") &&
                                  pathname === base &&
                                  scrollToHash(href)
                                ) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              {link.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
            <div className="mt-2 border-t border-white/10 pt-2">
              <p className="px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white/50">
                About the data
              </p>
              {referenceNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-sm px-3 py-1.5 text-sm transition-colors hover:bg-white/10",
                    pathActive(pathname, item.href)
                      ? "text-white"
                      : "text-white/70",
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
