import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { TfrDecompositionSection } from "@/components/tfr-decomposition-section";
import { TFR_DECOMPOSITION } from "@/lib/sources/tfr-decomposition-data";

export const metadata: Metadata = {
  title: "Many Mothers or Large Families? Decomposing the Fertility Rate",
  description:
    "The total fertility rate is the product of two independent forces: the share of women who become mothers, and the average number of children those mothers have. Compare 47 countries on both.",
  alternates: { canonical: "/fertility/many-mothers-or-large-families" },
};

export default function TfrDecompositionPage() {
  return (
    <div>
      <PageHeader
        title={
          <>
            Many mothers, or{" "}
            <span className="text-destructive">large families</span>?
          </>
        }
        description="Total fertility rate = Total Maternal Rate × Children per Mother. Two countries with the same TFR can be getting there in opposite ways — one because most women become mothers but families stay small, the other because fewer women have children but those who do have several."
      />
      <div className="container space-y-10 py-8">
        <TfrDecompositionSection rows={TFR_DECOMPOSITION} />
      </div>
    </div>
  );
}
