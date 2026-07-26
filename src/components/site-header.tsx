"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { mainNav } from "@/lib/site";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/global-search";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

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

        <nav className="hidden items-center xl:flex">
          {mainNav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-2.5 py-2 text-[0.8125rem] font-medium transition-colors",
                  active
                    ? "text-white"
                    : "text-white/75 hover:text-white",
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
            asChild
            size="sm"
            className="hidden bg-brand-donate text-white hover:bg-brand-donate/90 sm:inline-flex"
          >
            <Link href="/support">Donate</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 xl:hidden"
            aria-label="Menu"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 xl:hidden">
          <nav className="container grid gap-0.5 py-3">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-sm px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10",
                  pathname.startsWith(item.href)
                    ? "text-white"
                    : "text-white/75",
                )}
              >
                {item.title}
              </Link>
            ))}
            <div className="mt-2 border-t border-white/10 pt-3">
              <Button
                asChild
                size="sm"
                className="w-full bg-brand-donate text-white hover:bg-brand-donate/90"
              >
                <Link href="/support" onClick={() => setMobileOpen(false)}>
                  Donate
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
