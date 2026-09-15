"use client";

import * as React from "react";

type ChartDisplay = {
  /** Render value labels on the plot for social / PNG sharing. */
  showValues: boolean;
  setShowValues: (next: boolean | ((prev: boolean) => boolean)) => void;
};

const ChartDisplayContext = React.createContext<ChartDisplay>({
  showValues: false,
  setShowValues: () => {},
});

export function ChartDisplayProvider({
  showValues,
  setShowValues,
  children,
}: ChartDisplay & { children: React.ReactNode }) {
  const value = React.useMemo(
    () => ({ showValues, setShowValues }),
    [showValues, setShowValues],
  );
  return (
    <ChartDisplayContext.Provider value={value}>
      {children}
    </ChartDisplayContext.Provider>
  );
}

/** Prefer an explicit prop; otherwise inherit from ChartCard / AssistantChart. */
export function useChartShowValues(override?: boolean) {
  const ctx = React.useContext(ChartDisplayContext);
  return override ?? ctx.showValues;
}

export function useChartDisplay() {
  return React.useContext(ChartDisplayContext);
}
