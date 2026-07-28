/* eslint-disable no-console */
// Curated list of major world cities (metro-area population, latest estimates).
// City-level fertility/GDP are sparse globally, so the city pages contextualise
// each city with its country's indicators. This list is the MVP seed; a fuller
// cities ingestion (e.g. from national statistical offices) can extend it.

import type { PrismaClient } from "@prisma/client";
import { slugify } from "../utils";

export interface CitySeed {
  name: string;
  iso3: string;
  admin1?: string;
  lat: number;
  lng: number;
  population: number;
  isCapital?: boolean;
}

export const CITIES: CitySeed[] = [
  { name: "Tokyo", iso3: "JPN", admin1: "Tokyo", lat: 35.6762, lng: 139.6503, population: 37400068, isCapital: true },
  { name: "Delhi", iso3: "IND", admin1: "Delhi", lat: 28.7041, lng: 77.1025, population: 32900000 },
  { name: "Shanghai", iso3: "CHN", admin1: "Shanghai", lat: 31.2304, lng: 121.4737, population: 29200000 },
  { name: "Dhaka", iso3: "BGD", lat: 23.8103, lng: 90.4125, population: 23200000, isCapital: true },
  { name: "São Paulo", iso3: "BRA", admin1: "São Paulo", lat: -23.5505, lng: -46.6333, population: 22600000 },
  { name: "Mexico City", iso3: "MEX", lat: 19.4326, lng: -99.1332, population: 22300000, isCapital: true },
  { name: "Cairo", iso3: "EGY", lat: 30.0444, lng: 31.2357, population: 22000000, isCapital: true },
  { name: "Beijing", iso3: "CHN", lat: 39.9042, lng: 116.4074, population: 21800000, isCapital: true },
  { name: "Mumbai", iso3: "IND", admin1: "Maharashtra", lat: 19.076, lng: 72.8777, population: 21300000 },
  { name: "Osaka", iso3: "JPN", lat: 34.6937, lng: 135.5023, population: 19000000 },
  { name: "Karachi", iso3: "PAK", lat: 24.8607, lng: 67.0011, population: 16800000 },
  { name: "Lagos", iso3: "NGA", lat: 6.5244, lng: 3.3792, population: 15900000 },
  { name: "Istanbul", iso3: "TUR", lat: 41.0082, lng: 28.9784, population: 15600000 },
  { name: "Buenos Aires", iso3: "ARG", lat: -34.6037, lng: -58.3816, population: 15400000, isCapital: true },
  { name: "Kolkata", iso3: "IND", lat: 22.5726, lng: 88.3639, population: 15100000 },
  { name: "Manila", iso3: "PHL", lat: 14.5995, lng: 120.9842, population: 14400000, isCapital: true },
  { name: "Guangzhou", iso3: "CHN", lat: 23.1291, lng: 113.2644, population: 14000000 },
  { name: "Los Angeles", iso3: "USA", admin1: "California", lat: 34.0522, lng: -118.2437, population: 12500000 },
  { name: "Moscow", iso3: "RUS", lat: 55.7558, lng: 37.6173, population: 12600000, isCapital: true },
  { name: "Paris", iso3: "FRA", lat: 48.8566, lng: 2.3522, population: 11100000, isCapital: true },
  { name: "Jakarta", iso3: "IDN", lat: -6.2088, lng: 106.8456, population: 11000000, isCapital: true },
  { name: "Seoul", iso3: "KOR", lat: 37.5665, lng: 126.978, population: 9900000, isCapital: true },
  { name: "London", iso3: "GBR", lat: 51.5074, lng: -0.1278, population: 9500000, isCapital: true },
  { name: "New York", iso3: "USA", admin1: "New York", lat: 40.7128, lng: -74.006, population: 18800000 },
  { name: "Lima", iso3: "PER", lat: -12.0464, lng: -77.0428, population: 11000000, isCapital: true },
  { name: "Bangkok", iso3: "THA", lat: 13.7563, lng: 100.5018, population: 10700000, isCapital: true },
  { name: "Tehran", iso3: "IRN", lat: 35.6892, lng: 51.389, population: 9500000, isCapital: true },
  { name: "Bogotá", iso3: "COL", lat: 4.711, lng: -74.0721, population: 11300000, isCapital: true },
  { name: "Ho Chi Minh City", iso3: "VNM", lat: 10.8231, lng: 106.6297, population: 9300000 },
  { name: "Hong Kong", iso3: "HKG", lat: 22.3193, lng: 114.1694, population: 7500000 },
  { name: "Singapore", iso3: "SGP", lat: 1.3521, lng: 103.8198, population: 6000000, isCapital: true },
  { name: "Madrid", iso3: "ESP", lat: 40.4168, lng: -3.7038, population: 6700000, isCapital: true },
  { name: "Toronto", iso3: "CAN", admin1: "Ontario", lat: 43.6532, lng: -79.3832, population: 6300000 },
  { name: "Berlin", iso3: "DEU", lat: 52.52, lng: 13.405, population: 3700000, isCapital: true },
  { name: "Johannesburg", iso3: "ZAF", lat: -26.2041, lng: 28.0473, population: 6000000 },
  { name: "Nairobi", iso3: "KEN", lat: -1.2921, lng: 36.8219, population: 5100000, isCapital: true },
  { name: "Sydney", iso3: "AUS", admin1: "New South Wales", lat: -33.8688, lng: 151.2093, population: 5300000 },
  { name: "Riyadh", iso3: "SAU", lat: 24.7136, lng: 46.6753, population: 7700000, isCapital: true },
  { name: "Santiago", iso3: "CHL", lat: -33.4489, lng: -70.6693, population: 6900000, isCapital: true },
  { name: "Rome", iso3: "ITA", lat: 41.9028, lng: 12.4964, population: 4300000, isCapital: true },
  { name: "Addis Ababa", iso3: "ETH", lat: 9.03, lng: 38.74, population: 5200000, isCapital: true },
  { name: "Kinshasa", iso3: "COD", lat: -4.4419, lng: 15.2663, population: 15000000, isCapital: true },
  { name: "Chicago", iso3: "USA", admin1: "Illinois", lat: 41.8781, lng: -87.6298, population: 8900000 },
  { name: "Houston", iso3: "USA", admin1: "Texas", lat: 29.7604, lng: -95.3698, population: 7200000 },
  { name: "Philadelphia", iso3: "USA", admin1: "Pennsylvania", lat: 39.9526, lng: -75.1652, population: 6100000 },
  { name: "Phoenix", iso3: "USA", admin1: "Arizona", lat: 33.4484, lng: -112.074, population: 5000000 },
  { name: "San Diego", iso3: "USA", admin1: "California", lat: 32.7157, lng: -117.1611, population: 3300000 },
  { name: "Dallas", iso3: "USA", admin1: "Texas", lat: 32.7767, lng: -96.797, population: 7800000 },
  { name: "San Jose", iso3: "USA", admin1: "California", lat: 37.3382, lng: -121.8863, population: 2000000 },
  { name: "Austin", iso3: "USA", admin1: "Texas", lat: 30.2672, lng: -97.7431, population: 2400000 },
  { name: "San Francisco", iso3: "USA", admin1: "California", lat: 37.7749, lng: -122.4194, population: 4700000 },
  { name: "Seattle", iso3: "USA", admin1: "Washington", lat: 47.6062, lng: -122.3321, population: 4000000 },
  { name: "Boston", iso3: "USA", admin1: "Massachusetts", lat: 42.3601, lng: -71.0589, population: 4900000 },
  { name: "Washington", iso3: "USA", admin1: "District of Columbia", lat: 38.9072, lng: -77.0369, population: 6300000, isCapital: true },
  { name: "Miami", iso3: "USA", admin1: "Florida", lat: 25.7617, lng: -80.1918, population: 6200000 },
  { name: "Atlanta", iso3: "USA", admin1: "Georgia", lat: 33.749, lng: -84.388, population: 6200000 },
  { name: "Amsterdam", iso3: "NLD", lat: 52.3676, lng: 4.9041, population: 2500000, isCapital: true },
  { name: "Stockholm", iso3: "SWE", lat: 59.3293, lng: 18.0686, population: 2400000, isCapital: true },
  { name: "Copenhagen", iso3: "DNK", lat: 55.6761, lng: 12.5683, population: 2100000, isCapital: true },
  { name: "Warsaw", iso3: "POL", lat: 52.2297, lng: 21.0122, population: 3100000, isCapital: true },
  { name: "Kuala Lumpur", iso3: "MYS", lat: 3.139, lng: 101.6869, population: 8200000, isCapital: true },
  { name: "Dubai", iso3: "ARE", lat: 25.2048, lng: 55.2708, population: 3500000 },
  { name: "Tel Aviv", iso3: "ISR", lat: 32.0853, lng: 34.7818, population: 4300000 },
];

export async function seedCities(prisma: PrismaClient) {
  const countries = new Map(
    (await prisma.country.findMany({ select: { id: true, iso3: true } })).map(
      (c) => [c.iso3, c.id],
    ),
  );
  let count = 0;
  for (const c of CITIES) {
    const countryId = countries.get(c.iso3);
    if (!countryId) continue;
    const slug = slugify(c.name);
    const data = {
      slug,
      name: c.name,
      countryId,
      admin1: c.admin1 ?? null,
      latitude: c.lat,
      longitude: c.lng,
      isCapital: c.isCapital ?? false,
      population: c.population,
    };
    await prisma.city.upsert({
      where: { slug },
      create: data,
      update: data,
    });
    count++;
  }
  console.log(`✔ ${count} cities`);
}
