/**
 * Editorial summary of why total fertility is falling — grounded in
 * Tomáš Sobotka's 2026 review (RBMO), for the in-app explainer dialog.
 */

export type TfrDeclineSection = {
  title: string;
  body: string;
};

export const TFR_DECLINE_SOURCE = {
  author: "Tomáš Sobotka",
  title: "The global fertility freefall: trends, drivers and uncertainties",
  journal: "Reproductive BioMedicine Online",
  year: 2026,
  doi: "10.1016/j.rbmo.2026.105831",
  url: "https://doi.org/10.1016/j.rbmo.2026.105831",
} as const;

export const TFR_DECLINE_INTRO =
  "Very low fertility has spread across high- and middle-income countries. More than two billion people live in places where the total fertility rate is below 1.3. The freefall is more widespread, deeper and more lasting than many earlier forecasts assumed — driven by overlapping structural, cultural and biomedical forces, not a single cause.";

export const TFR_DECLINE_SECTIONS: TfrDeclineSection[] = [
  {
    title: "Delayed childbearing",
    body: "Parenthood is shifting later, especially among people born in the 1990s. Later starts mean the period TFR runs below the family size these generations still say they want, and more couples hit age-related infertility before finishing their plans. Middle-income countries that still have young motherhood may see further declines as they move toward later reproduction.",
  },
  {
    title: "Partnerships and marriage",
    body: "Fertility is still tightly tied to intimate relationships. Fewer people of reproductive age live with a partner, early marriage has become rarer in middle-income countries, and in higher-income settings more adults in their 20s–40s are neither partnered nor dating. In East Asia, rising never-married shares are a major drag on births; in Australia, the retreat from marriage explained about half of a recent TFR drop.",
  },
  {
    title: "Gender, work and income",
    body: "The gender pattern cuts both ways. Many women see a real conflict between career and family and deprioritize childbearing where workplace and care norms stay unequal — especially in East Asia. For men, marriage and family formation are increasingly contingent on secure employment, income and (in some settings) parental wealth.",
  },
  {
    title: "Changing fertility preferences",
    body: "Until around 2010, a two-child norm held in most low-fertility countries. In the last 15 years that has eroded among young adults in East Asia, Europe and North America: intended family size often dips below two, and more people plan to stay childless. Completed fertility almost always ends up below those already-lower intentions.",
  },
  {
    title: "What is not the main driver",
    body: "Falling sperm counts are often blamed, but the evidence is mixed. When surveys control for age, the share of infertile couples looks stable or falling. Delayed parenthood — more first births planned in the mid-30s or later — does more to raise infertility and unfinished reproductive plans than sperm-quality trends alone.",
  },
  {
    title: "Uneven worldwide — and hard to reverse",
    body: "Europe, East Asia and the Americas are far below replacement, while much of sub-Saharan Africa and parts of the Middle East remain well above. Because population compounds, higher-fertility regions will keep growing relative to the lowest-fertility ones without large cultural or migration shifts. Pronatal policies that ignore unstable labour markets, anxiety about the future, partnership change and preferences usually fail to move the needle.",
  },
];
