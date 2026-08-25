import type { Metadata } from "next";
import {
  CountryTopicPage,
  countryTopicRevalidate,
  generateCountryTopicMetadata,
} from "@/components/country-topic-page";

export const revalidate = countryTopicRevalidate;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return generateCountryTopicMetadata("gdp", slug);
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CountryTopicPage topicId="gdp" slug={slug} />;
}
