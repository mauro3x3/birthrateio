import pack from "@/lib/data/eurostat-citizen-flows.json";

export type CitizenFlowPack = typeof pack;
export type CitizenFlowRow = (typeof pack.rows)[number];

export const EUROSTAT_CITIZEN_FLOWS = pack;

export function getCitizenFlows() {
  return EUROSTAT_CITIZEN_FLOWS;
}
