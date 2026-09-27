import type { Metadata } from "next";
import { HomeHero } from "@/components/home-hero";
import { HomeEditorial } from "@/components/home-editorial";
import { HomeExplore } from "@/components/home-explore";

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeEditorial />
      <HomeExplore />
    </>
  );
}
