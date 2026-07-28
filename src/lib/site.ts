export const siteConfig = {
  name: "birthrate.io",
  tagline: "The world's demographic data platform",
  description:
    "Explore fertility, population, migration and economic trends for every country on Earth. Interactive charts, maps, projections and a demographic simulator — powered by UN, World Bank and OECD data.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ogImage: "/og",
  links: {
    github: "https://github.com",
  },
};

/** Ko-fi, Stripe Payment Link, PayPal, etc. Amount/frequency query params are appended. */
export const supportConfig = {
  donationUrl: process.env.NEXT_PUBLIC_DONATION_URL ?? "",
  suggestedAmounts: [5, 10, 25, 50, 100],
  currency: "USD",
};

export const mainNav = [
  { title: "Fertility", href: "/fertility" },
  { title: "Population", href: "/population" },
  { title: "Migration", href: "/migration" },
  { title: "Crime", href: "/crime" },
  { title: "States", href: "/states" },
  { title: "GDP", href: "/gdp" },
  { title: "Compare", href: "/compare" },
  { title: "Simulator", href: "/simulator" },
  { title: "Clock", href: "/clock" },
  { title: "Cities", href: "/cities" },
  { title: "Calendar", href: "/calendar" },
];
