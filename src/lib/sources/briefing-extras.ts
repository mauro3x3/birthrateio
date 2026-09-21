/**
 * Curated, cited extras for country briefings.
 * Prefer official audits. Do not invent pension-line items that are not on file.
 */
import { USA_BRIEFING_EXTRAS, type UsaBriefingExtras } from "./usa-briefing-extras";
import { migrationFiscalNoteForCountry } from "./europe-immigrant-fiscal-data";

export type BriefingExtras = {
  budget?: UsaBriefingExtras["budget"];
  migrationFiscal?: UsaBriefingExtras["migrationFiscal"];
  compositionWhy?: string;
};

/** Generic prose when a country has group shares but no curated “why” pack. */
export const GENERIC_COMPOSITION_WHY = `Group labels (race, ethnicity, religion, language, nativity) are census categories, not destiny — but groups often differ in age structure and in where they live. A younger group grows into school rolls and the future electorate faster; an older group weighs more on today’s pensions and care. Local majorities change school boards, clinics, and housing markets first. National averages hide that.

Frustration and cultural conflict show up when relative size changes fast in a place. That is descriptive demography. It does not tell a minister which coalition to build. It does tell a staffer why a single national TFR is the wrong chart for an election, school-finance, or redistricting meeting.`;

/** Generic migration fiscal framing when no national audit is curated. */
export const GENERIC_MIGRATION_FISCAL = `The fiscal effect of immigration depends mainly on age and education at arrival, not nativity alone. Working-age arrivals who work and pay tax ease the near-term budget; older or lower-earning arrivals draw more on schools and benefits. Children of immigrants are often net contributors over a lifetime. Cite a national audit when one is on file — do not invent a net cost or benefit.`;

const BY_ISO3: Record<string, BriefingExtras> = {
  USA: {
    budget: USA_BRIEFING_EXTRAS.budget,
    // Prefer National Academies lifetime framing; OECD row still available on /migration/fiscal-balance
    migrationFiscal: USA_BRIEFING_EXTRAS.migrationFiscal,
    compositionWhy: USA_BRIEFING_EXTRAS.compositionWhy,
  },
};

export function getBriefingExtras(iso3: string): BriefingExtras {
  const code = iso3.toUpperCase();
  const curated = BY_ISO3[code];
  const fromPack = migrationFiscalNoteForCountry(code);

  return {
    budget: curated?.budget,
    migrationFiscal:
      curated?.migrationFiscal ??
      fromPack ?? {
        note: GENERIC_MIGRATION_FISCAL,
        source:
          "birthrate.io briefing note (age/education framing; not a country audit)",
        sourceUrl: "https://birthrate.io/why",
      },
    compositionWhy: curated?.compositionWhy ?? GENERIC_COMPOSITION_WHY,
  };
}
