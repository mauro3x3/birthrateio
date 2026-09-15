"use client";

import * as React from "react";

type ChartDisplay = {
  /** Render value labels on the plot for social / PNG sharing. */
  showValues: boolean;
  setShowValues: (next: boolean | ((prev: boolean) => boolean)) => void;
  /** True while ChartCard is capturing a PNG — charts can enlarge for readability. */
  exporting: boolean;
};

const ChartDisplayContext = React.createContext<ChartDisplay>({
  showValues: false,
  setShowValues: () => {},
  exporting: false,
});

export function ChartDisplayProvider({
  showValues,
  setShowValues,
  exporting = false,
  children,
}: ChartDisplay & { children: React.ReactNode }) {
  const value = React.useMemo(
    () => ({ showValues, setShowValues, exporting }),
    [showValues, setShowValues, exporting],
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

export function useChartExporting() {
  return React.useContext(ChartDisplayContext).exporting;
}

export function useChartDisplay() {
  return React.useContext(ChartDisplayContext);
}
