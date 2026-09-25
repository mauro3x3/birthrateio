import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SectionHeading } from "@/components/section-heading";
import { ChartCard } from "@/components/charts/chart-card";
import { MultiSeriesChart } from "@/components/charts/multi-series-chart";
import { GroupedBarChart } from "@/components/charts/grouped-bar-chart";
import { TfrAncestryChart } from "@/components/tfr-ancestry-chart";
import { FertilityIncomeScatter } from "@/components/charts/fertility-income-scatter";
import { TfrUsGroupChart } from "@/components/tfr-by-group-chart";
import {
  TFR_BY_RACE_US,
  usRaceOverlay,
  TFR_BY_ORIGIN_AUSTRIA,
  IRANIAN_DIASPORA_EXOGAMY,
  AZERBAIJAN_VITAL_2026,
  EGYPT_VITAL_2025,
  COLOMBIA_VITAL_DANE,
  BOLIVIA_INE_PROJECTIONS,
  US_INTERMARRIAGE_PEW,
  JEWISH_INTERMARRIAGE_PEW,
  ASIAN_ETHNIC_MARRIAGE_ACS,
  EUROSTAT_MIXED_MARRIAGES,
  EUROPE_INTERMARRIAGE_RECENT,
  UK_INTERETHNIC_ONS,
  CONSANGUINITY_MENA,
  GLOBAL_INTERMARRIAGE_RECENT,
} from "@/lib/sources/fertility-spotlight-data";
import { getTfrAncestryPack } from "@/lib/sources/tfr-by-ancestry-data";
import { TFR_US_HISPANIC_ORIGIN } from "@/lib/sources/tfr-by-group-data";
import { getFertilityIncomeScatter } from "@/lib/queries";
import { safe } from "@/lib/safe";
import { formatNumber } from "@/lib/utils";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Fertility by race, origin & income",
  description:
    "U.S. fertility by race since 1980, European NSO mixed marriages and second-generation endogamy, UK ethnic partnerships, MENA consanguinity, Jewish and Iranian inmarriage, Asian co-ethnic marriage, GDP–fertility scatter, Egypt CAPMAS and Colombia DANE vitals, and recent national releases.",
  alternates: { canonical: "/fertility/race" },
};

export default async function FertilityByRacePage() {
  const { rows, series, callouts } = usRaceOverlay();
  const austriaPack = getTfrAncestryPack("AUT");
  const kosovoPack = getTfrAncestryPack("XKX");
  const scatter = await safe(getFertilityIncomeScatter(), []);

  const azeDiff = {
    births:
      AZERBAIJAN_VITAL_2026.vitalStats[1]!.liveBirths -
      AZERBAIJAN_VITAL_2026.vitalStats[0]!.liveBirths,
    deaths:
      AZERBAIJAN_VITAL_2026.vitalStats[1]!.deaths -
      AZERBAIJAN_VITAL_2026.vitalStats[0]!.deaths,
    natural:
      AZERBAIJAN_VITAL_2026.vitalStats[1]!.naturalIncrease -
      AZERBAIJAN_VITAL_2026.vitalStats[0]!.naturalIncrease,
  };

  const egyFull = EGYPT_VITAL_2025.vitalStats.slice(0, 2);
  const egyPartial = EGYPT_VITAL_2025.vitalStats.slice(2, 4);
  const egyFullDiff = {
    births: egyFull[1]!.liveBirths - egyFull[0]!.liveBirths,
    deaths: egyFull[1]!.deaths - egyFull[0]!.deaths,
    natural: egyFull[1]!.naturalIncrease - egyFull[0]!.naturalIncrease,
  };
  const colVital = COLOMBIA_VITAL_DANE.vitalStats;
  const colDiff = {
    births: colVital[1]!.liveBirths - colVital[0]!.liveBirths,
    deaths: colVital[1]!.deaths - colVital[0]!.deaths,
    natural: colVital[1]!.naturalIncrease - colVital[0]!.naturalIncrease,
  };
  const colTfrRows = COLOMBIA_VITAL_DANE.nationalTfr.map((r) => ({
    year: r.year,
    tfr: r.tfr,
  }));
  const egyPartialDiff = {
    births: egyPartial[1]!.liveBirths - egyPartial[0]!.liveBirths,
    deaths: egyPartial[1]!.deaths - egyPartial[0]!.deaths,
    natural: egyPartial[1]!.naturalIncrease - egyPartial[0]!.naturalIncrease,
  };

  const boliviaTfr = BOLIVIA_INE_PROJECTIONS.series.map((s) => ({
    year: s.year,
    TFR: s.tfr,
  }));

  const exogamyRows = IRANIAN_DIASPORA_EXOGAMY.rows.map((r) => ({
    generation: r.generation,
    Endogamy: r.endogamy,
    Exogamy: r.exogamy,
  }));

  const pewGroupRows = US_INTERMARRIAGE_PEW.groups.map((g) => ({
    group: g.group,
    Endogamy: g.endogamy,
    Exogamy: g.exogamy,
  }));

  const pewNativityRows = US_INTERMARRIAGE_PEW.byNativity.map((r) => ({
    group: `${r.group} · ${r.nativity}`,
    Endogamy: r.endogamy,
    Exogamy: r.exogamy,
  }));

  const jewishBranchRows = JEWISH_INTERMARRIAGE_PEW.currentlyMarried.map(
    (r) => ({
      branch: r.label,
      Endogamy: r.endogamy,
      Exogamy: r.exogamy,
    }),
  );

  const jewishCohortRows = JEWISH_INTERMARRIAGE_PEW.byMarriageCohort.map(
    (r) => ({
      cohort: r.cohort,
      Endogamy: r.endogamy,
      Exogamy: r.exogamy,
    }),
  );

  const asianEthnicRows = ASIAN_ETHNIC_MARRIAGE_ACS.groups.map((g) => ({
    group: g.group,
    Endogamy: g.endogamy,
    Interracial: g.interracial,
    Interethnic: g.interethnic,
  }));

  const euroMixedRows = EUROSTAT_MIXED_MARRIAGES.countries.map((c) => ({
    country: c.name,
    "Mixed marriage": c.mixedMarried,
  }));

  const eu = EUROPE_INTERMARRIAGE_RECENT;
  const euBinationalRows = eu.binationalShares.map((r) => ({
    country: `${r.country} · ${r.year}`,
    Share: r.share,
  }));
  const nlPartnerRows = eu.netherlands.rows
    .filter((r) => r.sameOriginTotal != null)
    .map((r) => ({
      group: r.group,
      "Same origin": r.sameOriginTotal as number,
      "Dutch partner": r.dutchPartner,
    }));
  const nordicPartnerRows = eu.nordicCompare.rows.map((r) => ({
    country: r.country,
    "Same-origin partner": r.sameOriginPartner,
    "Majority partner": r.majorityPartner,
  }));

  const ukEthnicRows = UK_INTERETHNIC_ONS.groups.map((g) => ({
    group: g.group,
    Endogamy: g.endogamy,
    Exogamy: g.exogamy,
  }));

  const consanguinityRows = [...CONSANGUINITY_MENA.countries]
    .sort((a, b) => b.overallMid - a.overallMid)
    .map((c) => ({
      country: c.country,
      Consanguinity: c.overallMid,
    }));

  const g = GLOBAL_INTERMARRIAGE_RECENT;
  const indiaRows = g.india.nfhs5.map((r) => ({
    measure: r.measure,
    Share: r.share,
  }));
  const chinaGroupRows = g.china.byGroup2010.map((r) => ({
    group: r.group,
    Interethnic: r.interethnic,
  }));
  const brazilRows = g.brazil.series.map((s) => ({
    year: s.year,
    Interracial: s.interracial,
  }));
  const japanRows = g.japan.series.map((s) => ({
    year: s.year,
    "Both Japanese": s.bothJapanese,
    "JP husband / foreign wife": s.japaneseHusbandForeignWife,
    "Foreign husband / JP wife": s.foreignHusbandJapaneseWife,
  }));
  const denmarkRows = g.denmark.mixedWithNative.map((r) => ({
    origin: r.origin,
    "Mixed with native": r.share,
  }));
  const usStockRows = g.unitedStates.rows.map((r) => ({
    group: r.group,
    Interracial: r.interracial,
  }));
  const chinaTrendRows = g.china.nationalTrend.map((r) => ({
    year: r.year,
    Interethnic: r.interethnicShareOfMarriages,
  }));
  const chinaMinorityRows = g.china.minorityInterethnicRate.map((r) => ({
    year: r.year,
    Interethnic: r.share,
  }));
  const indiaCohortRows = g.india.intercasteCohorts.map((r) => ({
    cohort: r.cohort,
    "Inter-caste": r.share,
  }));

  const vienna = (
    TFR_BY_ORIGIN_AUSTRIA as {
      regions?: Array<{
        name: string;
        series: Array<{ year: number; groups: Record<string, number> }>;
      }>;
    }
  ).regions?.[0];

  return (
    <div>
      <PageHeader
        title="Fertility by race, origin & income"
        description="Official and compiled splits that show who is having children — U.S. race/Hispanic origin over four decades, European origin tables, income, and a few hard-to-find national releases."
      />

      <div className="container space-y-14 py-8">
        <section>
          <SectionHeading
            id="united-states-race"
            title="United States — race and Hispanic origin"
            description={TFR_BY_RACE_US.note}
            tocLabel="US race"
          />
          <div className="mt-5">
            <ChartCard
              title={TFR_BY_RACE_US.headline}
              description="End labels show the latest value. 2024–2026 are provisional; earlier gaps between published anchors are interpolated for a continuous line."
              source={TFR_BY_RACE_US.source}
            >
              <MultiSeriesChart
                data={rows}
                series={series}
                height={440}
                decimals={2}
                unit="children per woman"
                referenceY={2.1}
                referenceLabel="Replacement ≈ 2.1"
                showValues
                endLabelStyle="datawrapper"
                callouts={callouts}
              />
            </ChartCard>
          </div>
          <div className="mt-6 max-w-xl">
            <h3 className="mb-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Latest final year (NCHS 2023)
            </h3>
            <TfrUsGroupChart
              pack={TFR_US_HISPANIC_ORIGIN}
              title="U.S. TFR by race and Hispanic origin, 2023"
            />
          </div>
        </section>

        <section>
          <SectionHeading
            id="income-fertility"
            title="Income and fertility"
            description="Across countries, higher GDP per capita still sits with lower period TFR — with rich East Asia at the extreme low end and parts of sub-Saharan Africa still well above replacement."
            tocLabel="Income"
          />
          <div className="mt-5">
            <FertilityIncomeScatter points={scatter} />
          </div>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
            Within-country income splits are rarer. DHS wealth quintiles (an asset
            index, not wages) are on the{" "}
            <Link href="/fertility/education#dhs-wealth" className="link-editorial">
              education &amp; wealth page
            </Link>
            .
          </p>
        </section>

        {austriaPack && (
          <section>
            <SectionHeading
              id="austria-origin"
              title="Austria — national origin"
              description={
                (TFR_BY_ORIGIN_AUSTRIA as { note?: string }).note ??
                austriaPack.definition
              }
              tocLabel="Austria"
            />
            <div className="mt-5">
              <TfrAncestryChart pack={austriaPack} />
            </div>
            {vienna && (
              <div className="mt-6 overflow-x-auto">
                <h3 className="mb-3 font-serif text-base font-semibold text-primary">
                  Vienna
                </h3>
                <table className="w-full max-w-lg text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-4">Group</th>
                      {vienna.series.map((s) => (
                        <th key={s.year} className="py-2 pr-4 tabular-nums">
                          {s.year}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {["Total", "Austrian origin", "Foreign origin"].map((g) => (
                      <tr key={g} className="border-b border-border/60">
                        <td className="py-2 pr-4">{g}</td>
                        {vienna.series.map((s) => (
                          <td key={s.year} className="py-2 pr-4 tabular-nums">
                            {formatNumber(s.groups[g] ?? NaN, 2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              Country page:{" "}
              <Link href="/country/austria" className="link-editorial">
                Austria
              </Link>
            </p>
          </section>
        )}

        {kosovoPack && (
          <section>
            <SectionHeading
              id="kosovo-ethnicity"
              title="Kosovo — ethnicity (MICS)"
              description={kosovoPack.definition}
              tocLabel="Kosovo"
            />
            <div className="mt-5">
              <TfrAncestryChart pack={kosovoPack} />
            </div>
          </section>
        )}

        <section>
          <SectionHeading
            id="intermarriage"
            title="Exogamy and endogamy"
            description="Who marries whom shapes the next generation’s ancestry mix. Measures differ by continent: U.S. race/ethnicity newlyweds, European native×foreign-born marriages, UK ethnic partnerships, Jewish religious inmarriage, Iranian and Asian co-ethnic spouses, and — in much of the Middle East and North Africa — kin marriage (consanguinity)."
            tocLabel="Intermarriage"
          />

          <div className="mt-5 space-y-8">
            <ChartCard
              title={g.unitedStates.title}
              description={`${g.unitedStates.note} For comparison, Pew’s 2015 newlywed rate was ${g.unitedStates.pewNewlyweds2015}% (stock of all married: ${g.unitedStates.pewMarriedStock2015}%).`}
              source={g.unitedStates.source}
            >
              <GroupedBarChart
                data={usStockRows}
                series={[
                  {
                    key: "Interracial",
                    label: "Interracial / interethnic couples",
                    color: "hsl(24 68% 50%)",
                  },
                ]}
                xKey="group"
                unit="%"
                decimals={0}
                height={300}
              />
            </ChartCard>

            <ChartCard
              title={g.india.title}
              description={`NFHS-5 currently married women. Pew finds ${g.india.pewSameReligionSpouse}% report a same-religion spouse. Inter-caste rose from ${g.india.intercasteCohorts[0]!.share}% (${g.india.intercasteCohorts[0]!.cohort}) to ${g.india.intercasteCohorts[1]!.share}% (${g.india.intercasteCohorts[1]!.cohort}). ${g.india.note}`}
              source={g.india.source}
            >
              <GroupedBarChart
                data={indiaRows}
                series={[
                  {
                    key: "Share",
                    label: "% of currently married women",
                    color: "hsl(213 62% 36%)",
                  },
                ]}
                xKey="measure"
                unit="%"
                decimals={0}
                height={260}
              />
            </ChartCard>
            <ChartCard
              title="India — inter-caste marriage by cohort"
              description="Slow rise over four decades of marriage cohorts (NFHS analyses)."
              source={g.india.source}
            >
              <GroupedBarChart
                data={indiaCohortRows}
                series={[
                  {
                    key: "Inter-caste",
                    label: "Inter-caste share",
                    color: "hsl(140 32% 36%)",
                  },
                ]}
                xKey="cohort"
                unit="%"
                decimals={1}
                height={240}
              />
            </ChartCard>

            <ChartCard
              title={g.china.title}
              description={`Among ethnic minorities, interethnic marriage reached ${g.china.minorityInterethnicRate[1]!.share}% in 2020 (up from ${g.china.minorityInterethnicRate[0]!.share}% in 2010). National share of all marriages that are interethnic is still low because Han are ~91% of the population. ${g.china.note}`}
              source={g.china.source}
            >
              <MultiSeriesChart
                data={chinaTrendRows}
                series={[
                  {
                    key: "Interethnic",
                    label: "% of all marriages interethnic",
                    color: "hsl(213 62% 36%)",
                  },
                ]}
                height={260}
                decimals={2}
                showValues
              />
            </ChartCard>
            <ChartCard
              title="China — minority interethnic rate and groups"
              description="2020 census: minorities born in the 1990s ~35% interethnic; bachelor’s ~50%, graduate ~70%. Group rates below are 2010 census (Wang et al.)."
              source={g.china.source}
            >
              <GroupedBarChart
                data={chinaGroupRows}
                series={[
                  {
                    key: "Interethnic",
                    label: "Interethnic marriage % (2010)",
                    color: "hsl(24 55% 42%)",
                  },
                ]}
                xKey="group"
                unit="%"
                decimals={1}
                height={320}
              />
            </ChartCard>
            <p className="text-sm text-muted-foreground">
              Minority interethnic rate:{" "}
              {chinaMinorityRows
                .map((r) => `${r.year} → ${r.Interethnic}%`)
                .join(" · ")}
              .
            </p>

            <ChartCard
              title={g.brazil.title}
              description={g.brazil.note}
              source={g.brazil.source}
            >
              <MultiSeriesChart
                data={brazilRows}
                series={[
                  {
                    key: "Interracial",
                    label: "Interracial unions (ages 20–24)",
                    color: "hsl(140 32% 36%)",
                  },
                ]}
                height={280}
                decimals={1}
                showValues
              />
            </ChartCard>

            <ChartCard
              title={g.japan.title}
              description={g.japan.note}
              source={g.japan.source}
            >
              <MultiSeriesChart
                data={japanRows}
                series={[
                  {
                    key: "Both Japanese",
                    label: "Both Japanese",
                    color: "hsl(213 62% 36%)",
                  },
                  {
                    key: "JP husband / foreign wife",
                    label: "JP husband / foreign wife",
                    color: "hsl(24 68% 50%)",
                  },
                  {
                    key: "Foreign husband / JP wife",
                    label: "Foreign husband / JP wife",
                    color: "hsl(140 32% 36%)",
                  },
                ]}
                height={320}
                decimals={2}
                showValues
              />
            </ChartCard>

            <ChartCard
              title={g.denmark.title}
              description={g.denmark.note}
              source={g.denmark.source}
            >
              <GroupedBarChart
                data={denmarkRows}
                series={[
                  {
                    key: "Mixed with native",
                    label: "% ever mixed union with native Dane",
                    color: "hsl(213 62% 36%)",
                  },
                ]}
                xKey="origin"
                unit="%"
                decimals={0}
                height={280}
              />
            </ChartCard>

            <div className="overflow-x-auto rounded-sm border border-border/60 p-4">
              <h3 className="mb-2 font-serif text-base font-semibold text-primary">
                {g.pakistan.title}
              </h3>
              <p className="mb-3 text-sm text-muted-foreground">
                {g.pakistan.note}
              </p>
              <p className="text-sm tabular-nums">
                First-cousin marriage:{" "}
                <span className="font-medium">{g.pakistan.firstCousin}%</span>{" "}
                (2017–18) vs {g.pakistan.firstCousin1990}% (1990–91) · Any
                consanguineous:{" "}
                <span className="font-medium">
                  {g.pakistan.anyConsanguineous}%
                </span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Source:{" "}
                <a
                  href={g.pakistan.sourceUrl}
                  className="link-editorial"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Pakistan DHS 2017–18
                </a>
              </p>
            </div>

            <ChartCard
              title={EUROSTAT_MIXED_MARRIAGES.title}
              description={`Europe average ${EUROSTAT_MIXED_MARRIAGES.europeAverage}% of married persons (${EUROSTAT_MIXED_MARRIAGES.period}). ${EUROSTAT_MIXED_MARRIAGES.note}`}
              source={EUROSTAT_MIXED_MARRIAGES.source}
            >
              <GroupedBarChart
                data={euroMixedRows}
                series={[
                  {
                    key: "Mixed marriage",
                    label: "% in mixed marriage",
                    color: "hsl(213 62% 36%)",
                  },
                ]}
                xKey="country"
                unit="%"
                decimals={1}
                height={420}
              />
            </ChartCard>
            <p className="text-sm text-muted-foreground">
              Full table:{" "}
              <a
                href={EUROSTAT_MIXED_MARRIAGES.sourceUrl}
                className="link-editorial"
                target="_blank"
                rel="noopener noreferrer"
              >
                Eurostat KS-SF-12-029
              </a>
            </p>

            <ChartCard
              title={eu.title}
              description={eu.note}
              source="CBS, Destatis, INSEE, ISTAT, INE (ES/PT), Statbel, BFS, SSB"
            >
              <GroupedBarChart
                data={euBinationalRows}
                series={[
                  {
                    key: "Share",
                    label: "Binational / mixed share",
                    color: "hsl(213 62% 36%)",
                  },
                ]}
                xKey="country"
                unit="%"
                decimals={1}
                height={340}
              />
            </ChartCard>
            <div className="overflow-x-auto">
              <table className="w-full max-w-3xl text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4">Country</th>
                    <th className="py-2 pr-4">Year</th>
                    <th className="py-2 pr-4">Measure</th>
                    <th className="py-2 pr-4">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {eu.binationalShares.map((r) => (
                    <tr
                      key={`${r.country}-${r.year}`}
                      className="border-b border-border/60"
                    >
                      <td className="py-2 pr-4">{r.country}</td>
                      <td className="py-2 pr-4 tabular-nums">{r.year}</td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {r.measure}
                      </td>
                      <td className="py-2 pr-4 tabular-nums font-medium">
                        {r.share}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">
                France {eu.france.years[1]!.year}:{" "}
                {eu.france.years[1]!.mixedShare}% French×foreign;{" "}
                {eu.france.years[1]!.atLeastOneForeignShare}% with ≥1 foreign
                spouse. Switzerland {eu.switzerland.years[1]!.year}:{" "}
                {eu.switzerland.years[1]!.binationalShare}% gemischtnational.
                Portugal {eu.portugal.years[1]!.year}:{" "}
                {eu.portugal.years[1]!.mixedShare}% Portuguese×foreign. Belgium{" "}
                {eu.belgium.year}: {eu.belgium.mixedShare}% different
                nationality group.
              </p>
            </div>

            <ChartCard
              title={eu.netherlands.title}
              description={eu.netherlands.note}
              source={eu.netherlands.source}
            >
              <GroupedBarChart
                data={nlPartnerRows}
                series={[
                  {
                    key: "Same origin",
                    label: "Same-origin partner",
                    color: "hsl(24 68% 50%)",
                  },
                  {
                    key: "Dutch partner",
                    label: "Dutch-background partner",
                    color: "hsl(213 62% 36%)",
                  },
                ]}
                xKey="group"
                unit="%"
                decimals={1}
                height={360}
              />
            </ChartCard>
            <p className="text-sm text-muted-foreground">
              Source:{" "}
              <a
                href={eu.netherlands.sourceUrl}
                className="link-editorial"
                target="_blank"
                rel="noopener noreferrer"
              >
                CBS Integratie en Samenleven 2022
              </a>
            </p>

            <ChartCard
              title={eu.nordicCompare.title}
              description={`${eu.nordicCompare.note} Norway SSB: ${eu.norway.immigrantBackgroundSpouse}% of Norwegian-born to immigrant parents married someone with immigrant background; ${eu.norway.sameCountryOfOriginSpouse}% same country of origin.`}
              source={eu.nordicCompare.source}
            >
              <GroupedBarChart
                data={nordicPartnerRows}
                series={[
                  {
                    key: "Same-origin partner",
                    label: "Same-origin partner",
                    color: "hsl(24 68% 50%)",
                  },
                  {
                    key: "Majority partner",
                    label: "Majority-background partner",
                    color: "hsl(213 62% 36%)",
                  },
                ]}
                xKey="country"
                unit="%"
                decimals={0}
                height={280}
              />
            </ChartCard>
            <p className="text-sm text-muted-foreground">
              Sources:{" "}
              <a
                href={eu.nordicCompare.sourceUrl}
                className="link-editorial"
                target="_blank"
                rel="noopener noreferrer"
              >
                Wiik & Holland (NO vs SE)
              </a>
              {" · "}
              <a
                href={eu.norway.sourceUrl}
                className="link-editorial"
                target="_blank"
                rel="noopener noreferrer"
              >
                SSB spouse choice
              </a>
              {" · "}
              <a
                href={eu.france.sourceUrl}
                className="link-editorial"
                target="_blank"
                rel="noopener noreferrer"
              >
                INSEE Retro6
              </a>
              {" · "}
              <a
                href={eu.switzerland.sourceUrl}
                className="link-editorial"
                target="_blank"
                rel="noopener noreferrer"
              >
                BFS
              </a>
              {" · "}
              <a
                href={eu.belgium.sourceUrl}
                className="link-editorial"
                target="_blank"
                rel="noopener noreferrer"
              >
                Statbel
              </a>
            </p>

            <ChartCard
              title={UK_INTERETHNIC_ONS.title}
              description={`Overall ${UK_INTERETHNIC_ONS.overall}% in 2011 (was ${UK_INTERETHNIC_ONS.overall2001}% in 2001). ${UK_INTERETHNIC_ONS.note}`}
              source={UK_INTERETHNIC_ONS.source}
            >
              <GroupedBarChart
                data={ukEthnicRows}
                series={[
                  {
                    key: "Endogamy",
                    label: "Same ethnic group",
                    color: "hsl(213 62% 36%)",
                  },
                  {
                    key: "Exogamy",
                    label: "Different ethnic group",
                    color: "hsl(24 68% 50%)",
                  },
                ]}
                xKey="group"
                unit="%"
                decimals={0}
                height={400}
              />
            </ChartCard>

            <ChartCard
              title={CONSANGUINITY_MENA.title}
              description={`About ${CONSANGUINITY_MENA.worldContext.shareOfWorldInPreferringCommunities}% of the world lives in communities that prefer kin marriage. Arab populations often sit in the ${CONSANGUINITY_MENA.worldContext.arabTypicalRange} range. Bars use midpoints of published survey ranges (or preferred national estimates where noted).`}
              source={CONSANGUINITY_MENA.source}
            >
              <GroupedBarChart
                data={consanguinityRows}
                series={[
                  {
                    key: "Consanguinity",
                    label: "Consanguineous marriages",
                    color: "hsl(24 55% 42%)",
                  },
                ]}
                xKey="country"
                unit="%"
                decimals={0}
                height={400}
              />
            </ChartCard>
            <div className="overflow-x-auto">
              <h3 className="mb-3 font-serif text-base font-semibold text-primary">
                Recent national spotlights
              </h3>
              <table className="w-full max-w-2xl text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4">Country</th>
                    <th className="py-2 pr-4">Year</th>
                    <th className="py-2 pr-4">Any relative</th>
                    <th className="py-2 pr-4">First cousin</th>
                    <th className="py-2 pr-4">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {CONSANGUINITY_MENA.spotlight.map((r) => (
                    <tr key={r.country} className="border-b border-border/60">
                      <td className="py-2 pr-4">{r.country}</td>
                      <td className="py-2 pr-4 tabular-nums">{r.year}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {r.anyRelative}%
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {r.firstCousin != null ? `${r.firstCousin}%` : "—"}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {r.source}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ChartCard
              title={US_INTERMARRIAGE_PEW.title}
              description={`In ${US_INTERMARRIAGE_PEW.year}, ${US_INTERMARRIAGE_PEW.overallNewlyweds}% of all U.S. newlyweds intermarried (${US_INTERMARRIAGE_PEW.overallMarriedStock}% of all currently married people). Endogamy = 100 − exogamy for the same universe.`}
              source={US_INTERMARRIAGE_PEW.source}
            >
              <GroupedBarChart
                data={pewGroupRows}
                series={[
                  {
                    key: "Endogamy",
                    label: "Endogamy (same race/ethnicity)",
                    color: "hsl(213 62% 36%)",
                  },
                  {
                    key: "Exogamy",
                    label: "Exogamy (different race/ethnicity)",
                    color: "hsl(24 68% 50%)",
                  },
                ]}
                xKey="group"
                unit="%"
                decimals={0}
                height={300}
              />
            </ChartCard>

            <ChartCard
              title="Hispanic and Asian newlyweds by nativity"
              description={US_INTERMARRIAGE_PEW.note}
              source={US_INTERMARRIAGE_PEW.source}
            >
              <GroupedBarChart
                data={pewNativityRows}
                series={[
                  {
                    key: "Endogamy",
                    label: "Endogamy",
                    color: "hsl(213 62% 36%)",
                  },
                  {
                    key: "Exogamy",
                    label: "Exogamy",
                    color: "hsl(24 68% 50%)",
                  },
                ]}
                xKey="group"
                unit="%"
                decimals={0}
                height={300}
              />
            </ChartCard>

            <div className="overflow-x-auto">
              <h3 className="mb-3 font-serif text-base font-semibold text-primary">
                Gender gaps (newlywed exogamy, 2015)
              </h3>
              <table className="w-full max-w-lg text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4">Group</th>
                    <th className="py-2 pr-4">Exogamy %</th>
                  </tr>
                </thead>
                <tbody>
                  {US_INTERMARRIAGE_PEW.byGender.map((r) => (
                    <tr key={r.group} className="border-b border-border/60">
                      <td className="py-2 pr-4">{r.group}</td>
                      <td className="py-2 pr-4 tabular-nums">{r.exogamy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">
                Source:{" "}
                <a
                  href={US_INTERMARRIAGE_PEW.sourceUrl}
                  className="link-editorial"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Pew Research Center
                </a>
              </p>
            </div>

            <ChartCard
              title={JEWISH_INTERMARRIAGE_PEW.title}
              description={JEWISH_INTERMARRIAGE_PEW.note}
              source={JEWISH_INTERMARRIAGE_PEW.source}
            >
              <GroupedBarChart
                data={jewishBranchRows}
                series={[
                  {
                    key: "Endogamy",
                    label: "Jewish spouse",
                    color: "hsl(213 62% 36%)",
                  },
                  {
                    key: "Exogamy",
                    label: "Non-Jewish spouse",
                    color: "hsl(24 68% 50%)",
                  },
                ]}
                xKey="branch"
                unit="%"
                decimals={0}
                height={320}
              />
            </ChartCard>

            <ChartCard
              title="Jewish intermarriage by marriage cohort"
              description="Among Jews married in 2010–2020, 61% have a non-Jewish spouse; among non-Orthodox Jews in that window, 72%."
              source={JEWISH_INTERMARRIAGE_PEW.source}
            >
              <GroupedBarChart
                data={jewishCohortRows}
                series={[
                  {
                    key: "Endogamy",
                    label: "Jewish spouse",
                    color: "hsl(213 62% 36%)",
                  },
                  {
                    key: "Exogamy",
                    label: "Non-Jewish spouse",
                    color: "hsl(24 68% 50%)",
                  },
                ]}
                xKey="cohort"
                unit="%"
                decimals={0}
                height={320}
              />
            </ChartCard>

            <ChartCard
              title={IRANIAN_DIASPORA_EXOGAMY.title}
              description={IRANIAN_DIASPORA_EXOGAMY.note}
              source={IRANIAN_DIASPORA_EXOGAMY.source}
            >
              <GroupedBarChart
                data={exogamyRows}
                series={[
                  {
                    key: "Endogamy",
                    label: "Endogamy (Iranian spouse)",
                    color: "hsl(213 62% 36%)",
                  },
                  {
                    key: "Exogamy",
                    label: "Exogamy (other spouse)",
                    color: "hsl(24 68% 50%)",
                  },
                ]}
                xKey="generation"
                unit="%"
                decimals={0}
                height={280}
              />
            </ChartCard>
            <p className="text-sm text-muted-foreground">
              Iranian dashboard:{" "}
              <a
                href={IRANIAN_DIASPORA_EXOGAMY.sourceUrl}
                className="link-editorial"
                target="_blank"
                rel="noopener noreferrer"
              >
                iraniandiaspora.github.io
              </a>
            </p>

            <ChartCard
              title={ASIAN_ETHNIC_MARRIAGE_ACS.title}
              description={ASIAN_ETHNIC_MARRIAGE_ACS.note}
              source={ASIAN_ETHNIC_MARRIAGE_ACS.source}
            >
              <GroupedBarChart
                data={asianEthnicRows}
                series={[
                  {
                    key: "Endogamy",
                    label: "Same ethnicity",
                    color: "hsl(213 62% 36%)",
                  },
                  {
                    key: "Interracial",
                    label: "Non-Asian spouse",
                    color: "hsl(24 68% 50%)",
                  },
                  {
                    key: "Interethnic",
                    label: "Other Asian ethnicity",
                    color: "hsl(140 32% 36%)",
                  },
                ]}
                xKey="group"
                unit="%"
                decimals={1}
                height={360}
              />
            </ChartCard>
          </div>
        </section>

        <section>
          <SectionHeading
            id="bolivia-projections"
            title="Bolivia — INE projections"
            description={BOLIVIA_INE_PROJECTIONS.note}
            tocLabel="Bolivia"
          />
          <div className="mt-5">
            <ChartCard
              title="Bolivia projected total fertility rate, 2024–2034"
              description="INE Revisión 2025. Projected 2026 TFR of 1.56 sits near a typical U.S. provisional level."
              source={BOLIVIA_INE_PROJECTIONS.source}
            >
              <MultiSeriesChart
                data={boliviaTfr}
                series={[{ key: "TFR", label: "TFR", color: "hsl(213 62% 36%)" }]}
                height={300}
                decimals={2}
                referenceY={2.1}
                referenceLabel="Replacement"
                showValues
              />
            </ChartCard>
          </div>
          <div className="mt-6">
            <ChartCard
              title="Bolivia projected net international migration"
              description="Saldo migratorio stays negative through the projection window."
              source={BOLIVIA_INE_PROJECTIONS.source}
            >
              <MultiSeriesChart
                data={BOLIVIA_INE_PROJECTIONS.series
                  .filter((s) => typeof s.netMigration === "number")
                  .map((s) => ({
                    year: s.year,
                    "Net migration": s.netMigration as number,
                  }))}
                series={[
                  {
                    key: "Net migration",
                    label: "Net migration",
                    color: "hsl(0 55% 42%)",
                  },
                ]}
                height={260}
                decimals={0}
                unit="people"
                showValues
              />
            </ChartCard>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            <Link href="/country/bolivia" className="link-editorial">
              Bolivia country page
            </Link>
          </p>
        </section>

        <section>
          <SectionHeading
            id="azerbaijan-vitals"
            title="Azerbaijan — recent vital statistics"
            description={AZERBAIJAN_VITAL_2026.note}
            tocLabel="Azerbaijan"
          />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full max-w-2xl text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4">Period</th>
                  <th className="py-2 pr-4">Live births</th>
                  <th className="py-2 pr-4">Deaths</th>
                  <th className="py-2 pr-4">Natural increase</th>
                </tr>
              </thead>
              <tbody>
                {AZERBAIJAN_VITAL_2026.vitalStats.map((r) => (
                  <tr key={r.period} className="border-b border-border/60">
                    <td className="py-2 pr-4">{r.period}</td>
                    <td className="py-2 pr-4 tabular-nums">
                      {r.liveBirths.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      {r.deaths.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      {r.naturalIncrease.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-border font-medium">
                  <td className="py-2 pr-4">Difference</td>
                  <td className="py-2 pr-4 tabular-nums text-destructive">
                    {azeDiff.births.toLocaleString()} (
                    {((azeDiff.births / AZERBAIJAN_VITAL_2026.vitalStats[0]!.liveBirths) * 100).toFixed(1)}
                    %)
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    +{azeDiff.deaths.toLocaleString()} (
                    {((azeDiff.deaths / AZERBAIJAN_VITAL_2026.vitalStats[0]!.deaths) * 100).toFixed(1)}
                    %)
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-destructive">
                    {azeDiff.natural.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Estimated TFR ≈ {AZERBAIJAN_VITAL_2026.estimatedTfr} (
            {AZERBAIJAN_VITAL_2026.estimatedTfrYear}). Neighbours on recent
            compiled series:{" "}
            {AZERBAIJAN_VITAL_2026.neighbors
              .map((n) => `${n.name} ${n.tfr}`)
              .join(" · ")}
            .{" "}
            <Link href="/country/azerbaijan" className="link-editorial">
              Azerbaijan country page
            </Link>
          </p>
        </section>

        <section>
          <SectionHeading
            id="egypt-vitals"
            title="Egypt — CAPMAS fertility & vitals"
            description={EGYPT_VITAL_2025.note}
            tocLabel="Egypt"
          />
          <div className="mt-5 grid gap-8 lg:grid-cols-2">
            <div className="overflow-x-auto">
              <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Full year
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4">Period</th>
                    <th className="py-2 pr-4">Live births</th>
                    <th className="py-2 pr-4">Deaths</th>
                    <th className="py-2 pr-4">Natural increase</th>
                  </tr>
                </thead>
                <tbody>
                  {egyFull.map((r) => (
                    <tr key={r.period} className="border-b border-border/60">
                      <td className="py-2 pr-4">{r.period}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {r.liveBirths.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {r.deaths.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {r.naturalIncrease.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-b border-border font-medium">
                    <td className="py-2 pr-4">Difference</td>
                    <td className="py-2 pr-4 tabular-nums text-destructive">
                      {egyFullDiff.births.toLocaleString()} (
                      {(
                        (egyFullDiff.births / egyFull[0]!.liveBirths) *
                        100
                      ).toFixed(2)}
                      %)
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      {egyFullDiff.deaths.toLocaleString()} (
                      {(
                        (egyFullDiff.deaths / egyFull[0]!.deaths) *
                        100
                      ).toFixed(2)}
                      %)
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-destructive">
                      {egyFullDiff.natural.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto">
              <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                January–July
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4">Period</th>
                    <th className="py-2 pr-4">Live births</th>
                    <th className="py-2 pr-4">Deaths</th>
                    <th className="py-2 pr-4">Natural increase</th>
                  </tr>
                </thead>
                <tbody>
                  {egyPartial.map((r) => (
                    <tr key={r.period} className="border-b border-border/60">
                      <td className="py-2 pr-4">{r.period}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {r.liveBirths.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {r.deaths.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {r.naturalIncrease.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-b border-border font-medium">
                    <td className="py-2 pr-4">Difference</td>
                    <td className="py-2 pr-4 tabular-nums">
                      +{egyPartialDiff.births.toLocaleString()} (
                      {(
                        (egyPartialDiff.births / egyPartial[0]!.liveBirths) *
                        100
                      ).toFixed(2)}
                      %)
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      +{egyPartialDiff.deaths.toLocaleString()} (
                      {(
                        (egyPartialDiff.deaths / egyPartial[0]!.deaths) *
                        100
                      ).toFixed(2)}
                      %)
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      +{egyPartialDiff.natural.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 max-w-3xl">
            <div className="border border-border/80 bg-card/40 px-4 py-3">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Births to women under 20
              </p>
              <p className="mt-1 text-sm tabular-nums">
                {EGYPT_VITAL_2025.under20BirthRate[0]!.year}:{" "}
                {EGYPT_VITAL_2025.under20BirthRate[0]!.perThousandWomen} →{" "}
                {EGYPT_VITAL_2025.under20BirthRate[1]!.year}:{" "}
                {EGYPT_VITAL_2025.under20BirthRate[1]!.perThousandWomen} per
                1,000 (−31%)
              </p>
            </div>
            <div className="border border-border/80 bg-card/40 px-4 py-3">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Support contraception before first pregnancy
              </p>
              <p className="mt-1 text-sm tabular-nums">
                Ages 15–29 singles:{" "}
                {
                  EGYPT_VITAL_2025.contraceptionSupportBeforeFirstPregnancy[0]!
                    .pct
                }
                % (
                {
                  EGYPT_VITAL_2025.contraceptionSupportBeforeFirstPregnancy[0]!
                    .year
                }
                ) →{" "}
                {
                  EGYPT_VITAL_2025.contraceptionSupportBeforeFirstPregnancy[1]!
                    .pct
                }
                % (
                {
                  EGYPT_VITAL_2025.contraceptionSupportBeforeFirstPregnancy[1]!
                    .year
                }
                )
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Estimated TFR ≈ {EGYPT_VITAL_2025.estimatedTfr} (
            {EGYPT_VITAL_2025.estimatedTfrYear};{" "}
            {EGYPT_VITAL_2025.tfrChangePctSince2021}% since 2021). Neighbours:{" "}
            {EGYPT_VITAL_2025.neighbors
              .map((n) => `${n.name} ${n.tfr}`)
              .join(" · ")}
            .{" "}
            <Link href="/country/egypt-arab-rep" className="link-editorial">
              Egypt country page
            </Link>
            {" · "}
            <Link href="/maps/mena" className="link-editorial">
              MENA map
            </Link>
          </p>
        </section>

        <section>
          <SectionHeading
            id="colombia-dane"
            title="Colombia — DANE national fertility"
            description={COLOMBIA_VITAL_DANE.note}
            tocLabel="Colombia"
          />
          <div className="mt-5 grid gap-8 lg:grid-cols-2">
            <ChartCard
              title="Total fertility rate, national total"
              subtitle="DANE Estadísticas Vitales · 2016–2025"
              source={COLOMBIA_VITAL_DANE.source}
              sourceUrl={COLOMBIA_VITAL_DANE.sourceUrl}
            >
              <MultiSeriesChart
                data={colTfrRows}
                xKey="year"
                series={[{ key: "tfr", label: "TGF", color: "#6b5b95" }]}
                yDomain={[1, 2]}
                yTicks={[1, 1.2, 1.4, 1.6, 1.8, 2]}
                showValues
                height={280}
              />
            </ChartCard>
            <div className="overflow-x-auto">
              <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Live births & deaths
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4">Period</th>
                    <th className="py-2 pr-4">Live births</th>
                    <th className="py-2 pr-4">Deaths</th>
                    <th className="py-2 pr-4">Natural increase</th>
                  </tr>
                </thead>
                <tbody>
                  {colVital.map((r) => (
                    <tr key={r.period} className="border-b border-border/60">
                      <td className="py-2 pr-4">{r.period}</td>
                      <td className="py-2 pr-4 tabular-nums">
                        {r.liveBirths.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {r.deaths.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {r.naturalIncrease.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-b border-border font-medium">
                    <td className="py-2 pr-4">Difference</td>
                    <td className="py-2 pr-4 tabular-nums text-destructive">
                      {colDiff.births.toLocaleString()} (
                      {(
                        (colDiff.births / colVital[0]!.liveBirths) *
                        100
                      ).toFixed(1)}
                      %)
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      +{colDiff.deaths.toLocaleString()} (
                      {(
                        (colDiff.deaths / colVital[0]!.deaths) *
                        100
                      ).toFixed(1)}
                      %)
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-destructive">
                      {colDiff.natural.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-4 text-sm text-muted-foreground">
                General fertility rate{" "}
                {COLOMBIA_VITAL_DANE.generalFertilityRate[0]!.year}:{" "}
                {
                  COLOMBIA_VITAL_DANE.generalFertilityRate[0]!
                    .perThousandWomen15to49
                }{" "}
                → {COLOMBIA_VITAL_DANE.generalFertilityRate[1]!.year}:{" "}
                {
                  COLOMBIA_VITAL_DANE.generalFertilityRate[1]!
                    .perThousandWomen15to49
                }{" "}
                births per 1,000 women 15–49. Infant mortality{" "}
                {COLOMBIA_VITAL_DANE.infantMortality[0]!.year}:{" "}
                {COLOMBIA_VITAL_DANE.infantMortality[0]!.perThousandLiveBirths} →{" "}
                {COLOMBIA_VITAL_DANE.infantMortality[1]!.year}:{" "}
                {COLOMBIA_VITAL_DANE.infantMortality[1]!.perThousandLiveBirths}{" "}
                per 1,000 live births.
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            National TGF {COLOMBIA_VITAL_DANE.estimatedTfr} in{" "}
            {COLOMBIA_VITAL_DANE.estimatedTfrYear}. Neighbours:{" "}
            {COLOMBIA_VITAL_DANE.neighbors
              .map((n) => `${n.name} ${n.tfr}`)
              .join(" · ")}
            .{" "}
            <Link href="/country/colombia" className="link-editorial">
              Colombia country page
            </Link>
            {" · "}
            <Link href="/maps/col" className="link-editorial">
              Department map
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
