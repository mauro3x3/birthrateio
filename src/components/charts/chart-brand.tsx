"use client";

import * as React from "react";

type ChartBrand = {
  /** Place name for shared exports, e.g. "Germany". */
  subject?: string;
  /** Canonical path for traffic, e.g. "/country/germany". */
  path?: string;
};

const ChartBrandContext = React.createContext<ChartBrand>({});

export function ChartBrandProvider({
  subject,
  path,
  children,
}: ChartBrand & { children: React.ReactNode }) {
  const value = React.useMemo(() => ({ subject, path }), [subject, path]);
  return (
    <ChartBrandContext.Provider value={value}>
      {children}
    </ChartBrandContext.Provider>
  );
}

export function useChartBrand() {
  return React.useContext(ChartBrandContext);
}
