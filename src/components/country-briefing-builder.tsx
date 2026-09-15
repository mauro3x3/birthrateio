"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  PenLine,
  Plus,
  Printer,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  AssistantChart,
  type AssistantChartSpec,
} from "@/components/assistant-chart";
import { BriefingPyramidCard } from "@/components/briefing-pyramid-card";
import { Button } from "@/components/ui/button";
import type { BriefingCallout } from "@/lib/briefing-facts";
import type {
  BriefingChart,
  BriefingModule,
  BriefingModuleId,
  BriefingPlaceAfter,
} from "@/lib/briefing-modules";
import type { PyramidRow } from "@/components/charts/population-pyramid";
import { cn } from "@/lib/utils";

export type BriefingBuilderInput = {
  name: string;
  slug: string;
  iso3: string;
  flagEmoji: string | null;
  headline: string;
  stakes: string[];
  modules: BriefingModule[];
  charts: Array<BriefingChart & { available: boolean }>;
  chartPreviews: AssistantChartSpec[];
  pyramid: { year: number; rows: PyramidRow[] } | null;
  mapHref: string | null;
  callouts: BriefingCallout[];
  cite: string[];
};

type BriefingResult = {
  title: string;
  dek: string;
  generatedAt: string;
  mode?: "ai" | "compiled" | "draft";
  sections: { id: string; heading: string; body: string }[];
  charts: AssistantChartSpec[];
  callouts?: { label: string; value: string; hint: string }[];
  sources: string[];
  links: { label: string; href: string }[];
};

function ToggleRow({
  checked,
  disabled,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-sm border border-border bg-card px-3 py-2.5",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs leading-relaxed text-muted-foreground">
          {description}
          {disabled ? " (no series on this country.)" : ""}
        </span>
      </span>
    </label>
  );
}

const EXPAND_INSTRUCTION =
  "Expand this section for a reader new to demography. If the body is empty, write a first draft from the facts. Add concrete official numbers that belong here. Keep the same point. About 180–350 words. Do not invent figures.";
const TIGHTEN_INSTRUCTION =
  "Tighten to about half the length. Keep every number. If the body is empty, write a short first draft from the facts. Do not invent figures.";

function AutoTextarea({
  value,
  onChange,
  className,
  placeholder,
  minRows = 3,
}: {
  value: string;
  onChange: (next: string) => void;
  className?: string;
  placeholder?: string;
  minRows?: number;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, minRows * 22)}px`;
  }, [value, minRows]);
  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "br-briefing-field w-full resize-none overflow-hidden bg-transparent",
        className,
      )}
    />
  );
}

export function CountryBriefingBuilder({
  input,
}: {
  input: BriefingBuilderInput;
}) {
  const [modules, setModules] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(input.modules.map((m) => [m.id, m.defaultOn])),
  );
  const [chartsOn, setChartsOn] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      input.charts.map((c) => [c.id, c.defaultOn && c.available]),
    ),
  );
  const [chartOrder, setChartOrder] = React.useState<string[]>(() =>
    input.charts.map((c) => c.id),
  );
  const [placements, setPlacements] = React.useState<
    Record<string, BriefingPlaceAfter>
  >(() =>
    Object.fromEntries(input.charts.map((c) => [c.id, c.defaultAfter])),
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<BriefingResult | null>(null);
  const [revisingId, setRevisingId] = React.useState<string | null>(null);
  const [sectionError, setSectionError] = React.useState<Record<string, string>>(
    {},
  );
  const [ask, setAsk] = React.useState<Record<string, string>>({});

  const selectedChartIds = () =>
    chartOrder.filter(
      (id) => chartsOn[id] && input.charts.find((c) => c.id === id)?.available,
    );

  const chartsFromPreviews = (ids: string[]): AssistantChartSpec[] => {
    const out: AssistantChartSpec[] = [];
    for (const id of ids) {
      const preview = input.chartPreviews.find((p) => p.id === id);
      if (!preview) continue;
      out.push({
        ...preview,
        after: placements[id] ?? preview.after ?? "top",
      });
    }
    return out;
  };

  const blankSources = () => [
    ...input.cite,
    "World Bank WDI (TFR, population, migration, age shares)",
  ];

  const blankLinks = () => [
    { label: `${input.name} profile`, href: `/country/${input.slug}` },
    { label: "Why birthrates matter", href: "/why" },
    ...(input.iso3 === "USA"
      ? [{ label: "US race & Hispanic origin map", href: "/demographics/us" }]
      : []),
    ...(input.mapHref
      ? [{ label: `${input.name} regional map`, href: input.mapHref }]
      : []),
  ];

  const moveChart = (id: string, dir: -1 | 1) => {
    setChartOrder((order) => {
      const i = order.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= order.length) return order;
      const next = [...order];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const patchSection = (
    id: string,
    patch: { heading?: string; body?: string },
  ) => {
    setResult((r) => {
      if (!r) return r;
      return {
        ...r,
        sections: r.sections.map((s) =>
          s.id === id ? { ...s, ...patch } : s,
        ),
      };
    });
  };

  const scrollToMemo = () => {
    window.setTimeout(() => {
      document.getElementById("briefing-output")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  const writeYourself = () => {
    const chosen = input.modules.filter((m) => modules[m.id]);
    if (chosen.length === 0) {
      setError("Select at least one section.");
      return;
    }
    setError(null);
    setSectionError({});
    setResult({
      title: `${input.name}: a demographic briefing`,
      dek: input.headline,
      generatedAt: new Date().toISOString(),
      mode: "draft",
      sections: chosen.map((m) => ({
        id: m.id,
        heading: m.label,
        body: "",
      })),
      charts: chartsFromPreviews(selectedChartIds()),
      callouts: input.callouts,
      sources: blankSources(),
      links: blankLinks(),
    });
    scrollToMemo();
  };

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const selected = selectedChartIds();
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: input.slug,
          modules: input.modules.filter((m) => modules[m.id]).map((m) => m.id),
          charts: selected,
          placements: Object.fromEntries(
            selected.map((id) => [id, placements[id] ?? "top"]),
          ),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed.");
        return;
      }
      setResult(data as BriefingResult);
      setSectionError({});
      scrollToMemo();
    } catch {
      setError("Could not reach the briefing service.");
    } finally {
      setBusy(false);
    }
  };

  const copyMemo = async () => {
    if (!result) return;
    const text = [
      result.title,
      result.dek,
      "",
      ...(result.callouts ?? []).map(
        (c) => `${c.label}: ${c.value} — ${c.hint}`,
      ),
      "",
      ...result.sections.flatMap((s) => [s.heading, s.body, ""]),
      "Sources",
      ...result.sources.map((s) => `- ${s}`),
      "",
      `Generated ${new Date(result.generatedAt).toISOString().slice(0, 10)} on birthrate.io/country/${input.slug}/brief`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
  };

  const reviseSection = async (id: string, instruction: string) => {
    if (!result) return;
    const section = result.sections.find((s) => s.id === id);
    if (!section) return;
    const prompt = instruction.trim();
    if (!prompt) {
      setSectionError((s) => ({
        ...s,
        [id]: "Say what to change, or use Expand / Tighten.",
      }));
      return;
    }
    setRevisingId(id);
    setSectionError((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revise",
          slug: input.slug,
          heading: section.heading,
          body: section.body,
          instruction: prompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSectionError((s) => ({
          ...s,
          [id]: typeof data.error === "string" ? data.error : "Failed.",
        }));
        return;
      }
      patchSection(id, {
        heading: typeof data.heading === "string" ? data.heading : section.heading,
        body: typeof data.body === "string" ? data.body : section.body,
      });
    } catch {
      setSectionError((s) => ({
        ...s,
        [id]: "Could not reach the briefing service.",
      }));
    } finally {
      setRevisingId(null);
    }
  };

  const addCustomSection = () => {
    setResult((r) => {
      if (!r) return r;
      return {
        ...r,
        sections: [
          ...r.sections,
          {
            id: `custom-${Date.now()}`,
            heading: "Your heading",
            body: "",
          },
        ],
      };
    });
  };

  const removeSection = (id: string) => {
    setResult((r) => {
      if (!r) return r;
      return { ...r, sections: r.sections.filter((s) => s.id !== id) };
    });
  };

  const enabledModuleIds = input.modules
    .filter((m) => modules[m.id])
    .map((m) => m.id);

  const moveResultChart = (id: string, dir: -1 | 1) => {
    setResult((r) => {
      if (!r) return r;
      const list = [...r.charts];
      const i = list.findIndex((c) => (c.id ?? c.title) === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return r;
      const next = [...list];
      const moving = { ...next[i], after: next[j].after };
      next[i] = next[j];
      next[j] = moving;
      return { ...r, charts: next };
    });
  };

  const chartsAfter = (after: string) =>
    (result?.charts ?? []).filter((c) => (c.after ?? "top") === after);

  const orphanCharts = (result?.charts ?? []).filter((c) => {
    const after = c.after ?? "top";
    if (after === "top") return false;
    return !result!.sections.some((s) => s.id === after);
  });

  return (
    <div className="space-y-8">
      <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          A memo you can forward: why fertility matters, how this country
          compares with its neighbors, and how many working-age people versus
          retirees the pyramid already implies. Tick sections, park each chart
          next to the paragraph it belongs with, then generate — or start from
          blank headings and write it yourself. After that, every heading and
          paragraph is editable, and Expand / Tighten / Ask AI can rewrite one
          section at a time.
        </p>
        <p className="text-foreground">{input.headline}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Sections
          </legend>
          {input.modules.map((m) => (
            <ToggleRow
              key={m.id}
              checked={!!modules[m.id]}
              onChange={(next) => setModules((s) => ({ ...s, [m.id]: next }))}
              label={m.label}
              description={m.description}
            />
          ))}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Charts — order and placement
          </legend>
          {chartOrder.map((id) => {
            const c = input.charts.find((x) => x.id === id);
            if (!c) return null;
            const preview = input.chartPreviews.find((p) => p.id === id);
            const on = !!chartsOn[id] && c.available;
            return (
              <div
                key={id}
                className={cn(
                  "rounded-sm border border-border bg-card px-3 py-2.5",
                  !c.available && "opacity-50",
                )}
              >
                <label className="flex cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    checked={on}
                    disabled={!c.available}
                    onChange={(e) =>
                      setChartsOn((s) => ({ ...s, [id]: e.target.checked }))
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {c.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {c.description}
                      {!c.available ? " (no series on this country.)" : ""}
                    </span>
                  </span>
                </label>
                {preview ? (
                  <div
                    className={cn(
                      "mt-2 print:hidden",
                      !on && "opacity-45 grayscale",
                    )}
                    aria-hidden={!on}
                  >
                    {preview.id === "pyramid" && input.pyramid ? (
                      <BriefingPyramidCard
                        year={input.pyramid.year}
                        rows={input.pyramid.rows}
                        countrySlug={input.slug}
                        countryName={input.name}
                      />
                    ) : (
                      <AssistantChart spec={preview} preview />
                    )}
                  </div>
                ) : null}
                {on ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 print:hidden">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Show after
                      <select
                        className="rounded-sm border border-border bg-background px-2 py-1 text-foreground"
                        value={placements[id] ?? c.defaultAfter}
                        onChange={(e) =>
                          setPlacements((s) => ({
                            ...s,
                            [id]: e.target.value as BriefingPlaceAfter,
                          }))
                        }
                      >
                        <option value="top">the headline</option>
                        {input.modules.map((m) => (
                          <option
                            key={m.id}
                            value={m.id}
                            disabled={!modules[m.id]}
                          >
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => moveChart(id, -1)}
                      aria-label={`Move ${c.label} up`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => moveChart(id, 1)}
                      aria-label={`Move ${c.label} down`}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </fieldset>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={generate} disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {busy ? "Writing…" : "Generate briefing"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={writeYourself}
          disabled={busy}
        >
          <PenLine className="h-4 w-4" />
          Write it yourself
        </Button>
        <p className="text-xs text-muted-foreground">
          AI prose uses the same OpenAI key as Cohort — add billing credits at
          platform.openai.com if generate or Expand fails. Limited to a few
          memos per hour. You can always type over the text.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <article
          id="briefing-output"
          className="br-briefing scroll-mt-24 space-y-6 border border-border bg-card p-5 md:p-8"
        >
          <header className="space-y-2 border-b border-border pb-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {input.flagEmoji} {input.name} · demographic briefing
              {result.mode === "compiled"
                ? " · compiled from official series"
                : result.mode === "draft"
                  ? " · your draft"
                  : ""}
            </p>
            <input
              value={result.title}
              onChange={(e) =>
                setResult((r) => (r ? { ...r, title: e.target.value } : r))
              }
              className="br-briefing-field w-full bg-transparent font-serif text-2xl font-semibold tracking-tight text-primary"
              aria-label="Briefing title"
            />
            <AutoTextarea
              value={result.dek}
              onChange={(next) =>
                setResult((r) => (r ? { ...r, dek: next } : r))
              }
              minRows={2}
              className="text-sm leading-relaxed text-muted-foreground"
              placeholder="One-line summary a staffer can forward."
            />
            {result.mode === "compiled" ? (
              <p className="text-xs text-muted-foreground">
                OpenAI returned no credits, so this is the sourced compilation
                — same figures and charts, without model prose. Add credits on
                the OpenAI account tied to <code>OPENAI_API_KEY</code> and
                generate again, or edit the text below yourself.
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground print:hidden">
              Click any heading or paragraph to type. Expand writes more on that
              subject; Tighten cuts it; Ask AI takes your own instruction.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 print:hidden">
              <Button type="button" size="sm" variant="outline" onClick={copyMemo}>
                Copy text
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
                Print / PDF
              </Button>
            </div>
          </header>

          {result.callouts && result.callouts.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {result.callouts.map((c) => (
                <div
                  key={c.label}
                  className="rounded-sm border border-border bg-muted/30 px-3 py-3"
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {c.label}
                  </p>
                  <p className="mt-1 font-serif text-2xl font-semibold text-primary">
                    {c.value}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {c.hint}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          <ChartBlock
            charts={chartsAfter("top")}
            onMove={moveResultChart}
            pyramid={input.pyramid}
            countrySlug={input.slug}
            countryName={input.name}
          />

          {result.sections.map((section) => {
            const custom = section.id.startsWith("custom-");
            const spinning = revisingId === section.id;
            return (
              <section key={section.id} className="space-y-3">
                <input
                  value={section.heading}
                  onChange={(e) =>
                    patchSection(section.id, { heading: e.target.value })
                  }
                  className="br-briefing-field w-full bg-transparent font-serif text-lg font-semibold text-primary"
                  aria-label="Section heading"
                />
                <AutoTextarea
                  value={section.body}
                  onChange={(next) =>
                    patchSection(section.id, { body: next })
                  }
                  minRows={4}
                  placeholder="Write this section yourself, or use Expand to draft it from the official series."
                  className="text-sm leading-relaxed text-muted-foreground"
                />
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={spinning}
                    onClick={() =>
                      void reviseSection(section.id, EXPAND_INSTRUCTION)
                    }
                  >
                    {spinning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Expand
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={spinning}
                    onClick={() =>
                      void reviseSection(section.id, TIGHTEN_INSTRUCTION)
                    }
                  >
                    Tighten
                  </Button>
                  {custom ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={spinning}
                      onClick={() => removeSection(section.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  ) : null}
                  <form
                    className="flex min-w-[16rem] flex-1 flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void reviseSection(
                        section.id,
                        (ask[section.id] ?? "").trim() ||
                          "Rewrite more clearly for a non-specialist. Keep every number. If the body is empty, write a first draft from the facts.",
                      );
                    }}
                  >
                    <input
                      value={ask[section.id] ?? ""}
                      onChange={(e) =>
                        setAsk((s) => ({
                          ...s,
                          [section.id]: e.target.value,
                        }))
                      }
                      placeholder="Ask AI: expand on child allowances…"
                      className="h-8 min-w-[12rem] flex-1 rounded-sm border border-input bg-background px-2 text-xs"
                      disabled={spinning}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="secondary"
                      disabled={spinning}
                    >
                      Ask AI
                    </Button>
                  </form>
                </div>
                {sectionError[section.id] ? (
                  <p className="text-xs text-destructive" role="alert">
                    {sectionError[section.id]}
                  </p>
                ) : null}
                <ChartBlock
                  charts={chartsAfter(section.id)}
                  onMove={moveResultChart}
                  pyramid={input.pyramid}
                  countrySlug={input.slug}
                  countryName={input.name}
                />
              </section>
            );
          })}

          <div className="print:hidden">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addCustomSection}
            >
              <Plus className="h-3.5 w-3.5" />
              Add a section
            </Button>
          </div>

          {orphanCharts.length > 0 ? (
            <ChartBlock
              charts={orphanCharts}
              onMove={moveResultChart}
              pyramid={input.pyramid}
              countrySlug={input.slug}
              countryName={input.name}
            />
          ) : null}

          {result.sources.length > 0 ? (
            <section className="space-y-1">
              <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Sources
              </h3>
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {result.sources.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {result.links.length > 0 ? (
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm print:hidden">
              {result.links.map((l) => (
                <Link key={l.href} href={l.href} className="link-editorial">
                  {l.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </article>
      ) : (
        <div className="max-w-3xl space-y-2 text-sm text-muted-foreground">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em]">
            This briefing will cover
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {input.stakes.map((s) => (
              <li key={s.slice(0, 40)}>{s}</li>
            ))}
          </ul>
          {enabledModuleIds.includes("labor" as BriefingModuleId) ? (
            <p>
              Working-age counts are modeled from today’s pyramid. 2040
              taxpayers are mostly already born; TFR shows up around 2060.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ChartBlock({
  charts,
  onMove,
  pyramid,
  countrySlug,
  countryName,
}: {
  charts: AssistantChartSpec[];
  onMove: (id: string, dir: -1 | 1) => void;
  pyramid?: { year: number; rows: PyramidRow[] } | null;
  countrySlug?: string;
  countryName?: string;
}) {
  if (charts.length === 0) return null;
  const wide =
    (spec: AssistantChartSpec) =>
      spec.id === "pyramid" ||
      spec.id === "composition" ||
      spec.id === "birthsComposition" ||
      spec.id === "migrationOrigins" ||
      spec.id === "migrationDestinations" ||
      spec.id === "budget" ||
      spec.id === "religion" ||
      spec.id === "health" ||
      spec.id === "share65" ||
      spec.layout === "horizontal" ||
      spec.type === "stackedArea";
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {charts.map((spec) => {
        const id = spec.id ?? spec.title;
        return (
          <div
            key={id}
            className={cn("space-y-1", wide(spec) && "md:col-span-2")}
          >
            <div className="flex justify-end gap-1 print:hidden">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onMove(id, -1)}
                aria-label="Move chart up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onMove(id, 1)}
                aria-label="Move chart down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            {spec.id === "pyramid" && pyramid && countrySlug && countryName ? (
              <BriefingPyramidCard
                year={pyramid.year}
                rows={pyramid.rows}
                countrySlug={countrySlug}
                countryName={countryName}
              />
            ) : (
              <AssistantChart spec={spec} />
            )}
          </div>
        );
      })}
    </div>
  );
}
