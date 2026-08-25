import type { Metadata } from "next";
import {
  CountryTopicPage,
  generateCountryTopicMetadata,
} from "@/components/country-topic-page";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return generateCountryTopicMetadata("migration", slug);
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CountryTopicPage topicId="migration" slug={slug} />;
}
