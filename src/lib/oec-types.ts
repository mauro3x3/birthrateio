export type TradeFlow = "export" | "import";

export type TradeProduct = {
  name: string;
  section: string;
  value: number;
  share: number;
};

export type CountryTrade = {
  year: number;
  flow: TradeFlow;
  total: number;
  products: TradeProduct[];
  oecId: string;
  source: string;
  sourceUrl: string;
};
