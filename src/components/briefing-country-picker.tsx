"use client";

import { useRouter } from "next/navigation";
import { CountrySelect } from "@/components/country-select";
import type { CountryOption } from "@/components/country-multi-select";

export function BriefingCountryPicker({
  options,
}: {
  options: CountryOption[];
}) {
  const router = useRouter();
  return (
    <CountrySelect
      options={options}
      value={null}
      onChange={(slug) => {
        if (slug) router.push(`/country/${slug}/brief`);
      }}
      placeholder="Search any country…"
    />
  );
}
