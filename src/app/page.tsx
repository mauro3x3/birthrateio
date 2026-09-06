import { HomeHero } from "@/components/home-hero";
import { HomeExplore } from "@/components/home-explore";

export const revalidate = 86400;

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeExplore />
    </>
  );
}
