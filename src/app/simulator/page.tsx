import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Simulator } from "@/components/simulator";
import { getAllCountries } from "@/lib/queries";
import { safe } from "@/lib/safe";

export const metadata: Metadata = {
  title: "Demographic Simulator — Population Projection Tool",
  description:
    "Project a population forward under your own fertility, mortality and migration assumptions. See population growth or decline and the changing age structure over time.",
  alternates: { canonical: "/simulator" },
};

export default async function SimulatorPage() {
  const countries = await safe(getAllCountries(), []);

  return (
    <div>
      <PageHeader
        title="Demographic Simulator"
        description="Pick a country to load real-world assumptions, or enter your own starting population. Adjust fertility, mortality and migration to see how demographics evolve."
      />
      <div className="container py-8">
        <Simulator
          countries={countries.map((c) => ({
            slug: c.slug,
            name: c.name,
            flagEmoji: c.flagEmoji,
          }))}
        />
      </div>
    </div>
  );
}
