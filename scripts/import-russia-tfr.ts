/**
 * Import Rosstat regional TFR (via Wikipedia table) for all federal subjects,
 * expand admin1-demographics.json, and assign slugs on admin1-rus.geojson.
 *
 * Source: https://en.wikipedia.org/wiki/List_of_federal_subjects_of_Russia_by_total_fertility_rate
 * (Суммарный коэффициент рождаемости / Rosstat)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "..");
const DEMO_PATH = path.join(ROOT, "src/lib/data/admin1-demographics.json");
const GEO_PATH = path.join(ROOT, "public/geo/admin1-rus.json");

/** Wikipedia short name → existing or preferred slug */
const WIKI_TO_SLUG: Record<string, string> = {
  Chechnya: "russia-chechnya",
  Tuva: "russia-tuva",
  "Yamalo Nenets A.O.": "russia-yamalo-nenets",
  "Altai Republic": "russia-altai-republic",
  Ingushetia: "russia-ingushetia",
  Dagestan: "russia-dagestan",
  "Tyumen Oblast": "russia-tyumen-oblast",
  "Sakhalin Oblast": "russia-sakhalin-oblast",
  Chukotka: "russia-chukotka",
  "Nenets Autonomous Okrug": "russia-nenets",
  "Khanty–Mansi A.O. (Yugra)": "russia-khanty-mansi",
  "Khanty-Mansi A.O. (Yugra)": "russia-khanty-mansi",
  "Astrakhan Oblast": "russia-astrakhan-oblast",
  "Irkutsk Oblast": "russia-irkutsk-oblast",
  "Kabardino-Balkaria": "russia-kabardino-balkaria",
  "North Ossetia–Alania": "russia-north-ossetia",
  "North Ossetia-Alania": "russia-north-ossetia",
  "Zabaykalsky Krai": "russia-zabaykalsky-krai",
  "Kamchatka Krai": "russia-kamchatka-krai",
  "Kurgan Oblast": "russia-kurgan-oblast",
  "Sverdlovsk Oblast": "russia-sverdlovsk-oblast",
  Buryatia: "russia-buryatia",
  "Sakha (Yakutia)": "russia-sakha",
  "Komi Republic": "russia-komi",
  "Krasnodar Krai": "russia-krasnodar-krai",
  "Perm Krai": "russia-perm-krai",
  Karelia: "russia-karelia",
  "Republic of Crimea": "russia-crimea",
  "Orenburg Oblast": "russia-orenburg-oblast",
  "Kostroma Oblast": "russia-kostroma-oblast",
  Khakassia: "russia-khakassia",
  "Novosibirsk Oblast": "russia-novosibirsk-oblast",
  Moscow: "russia-moscow",
  "Chelyabinsk Oblast": "russia-chelyabinsk-oblast",
  Tatarstan: "russia-tatarstan",
  "Khabarovsk Krai": "russia-khabarovsk-krai",
  "Omsk Oblast": "russia-omsk-oblast",
  "Kirov Oblast": "russia-kirov-oblast",
  "Primorsky Krai": "russia-primorsky-krai",
  "Amur Oblast": "russia-amur-oblast",
  "Arkhangelsk Oblast": "russia-arkhangelsk-oblast",
  "Krasnoyarsk Krai": "russia-krasnoyarsk-krai",
  "Murmansk Oblast": "russia-murmansk-oblast",
  Adygea: "russia-adygea",
  Chuvashia: "russia-chuvashia",
  Bashkortostan: "russia-bashkortostan",
  "Jewish Autonomous Oblast": "russia-jewish-autonomous-oblast",
  "Karachay-Cherkessia": "russia-karachay-cherkessia",
  Udmurtia: "russia-udmurtia",
  "Moscow Oblast": "russia-moscow-oblast",
  "Vologda Oblast": "russia-vologda-oblast",
  "Kaluga Oblast": "russia-kaluga-oblast",
  "Mari El": "russia-mari-el",
  "Samara Oblast": "russia-samara-oblast",
  "Ivanovo Oblast": "russia-ivanovo-oblast",
  "Rostov Oblast": "russia-rostov-oblast",
  "Pskov Oblast": "russia-pskov-oblast",
  Kalmykia: "russia-kalmykia",
  "Nizhny Novgorod Oblast": "russia-nizhny-novgorod-oblast",
  "Yaroslavl Oblast": "russia-yaroslavl-oblast",
  "Ulyanovsk Oblast": "russia-ulyanovsk-oblast",
  "Stavropol Krai": "russia-stavropol-krai",
  "Tver Oblast": "russia-tver-oblast",
  "Saint Petersburg": "russia-saint-petersburg",
  "Kursk Oblast": "russia-kursk-oblast",
  "Altai Krai": "russia-altai-krai",
  "Magadan Oblast": "russia-magadan-oblast",
  "Novgorod Oblast": "russia-novgorod-oblast",
  "Voronezh Oblast": "russia-voronezh-oblast",
  "Kaliningrad Oblast": "russia-kaliningrad-oblast",
  "Oryol Oblast": "russia-oryol-oblast",
  "Lipetsk Oblast": "russia-lipetsk-oblast",
  "Kemerovo Oblast": "russia-kemerovo-oblast",
  "Tomsk Oblast": "russia-tomsk-oblast",
  "Tambov Oblast": "russia-tambov-oblast",
  "Penza Oblast": "russia-penza-oblast",
  "Bryansk Oblast": "russia-bryansk-oblast",
  "Vladimir Oblast": "russia-vladimir-oblast",
  "Tula Oblast": "russia-tula-oblast",
  "Ryazan Oblast": "russia-ryazan-oblast",
  "Volgograd Oblast": "russia-volgograd-oblast",
  "Belgorod Oblast": "russia-belgorod-oblast",
  "Saratov Oblast": "russia-saratov-oblast",
  "Smolensk Oblast": "russia-smolensk-oblast",
  Sevastopol: "russia-sevastopol",
  Mordovia: "russia-mordovia",
  "Leningrad Oblast": "russia-leningrad-oblast",
};

/** Geo feature name → slug (Natural Earth labels) */
const GEO_NAME_TO_SLUG: Record<string, string> = {
  "Altai Krai": "russia-altai-krai",
  Pskov: "russia-pskov-oblast",
  "Krasnodar Krai": "russia-krasnodar-krai",
  "Karachay-Cherkess Republic": "russia-karachay-cherkessia",
  "Kabardino-Balkaria": "russia-kabardino-balkaria",
  "Republic of North Ossetia-Alania": "russia-north-ossetia",
  "Republic of Ingushetia": "russia-ingushetia",
  "Chechen Republic": "russia-chechnya",
  "Republic of Dagestan": "russia-dagestan",
  Murmansk: "russia-murmansk-oblast",
  Karelia: "russia-karelia",
  "Leningrad Oblast": "russia-leningrad-oblast",
  Kaliningrad: "russia-kaliningrad-oblast",
  Smolensk: "russia-smolensk-oblast",
  Bryansk: "russia-bryansk-oblast",
  Kursk: "russia-kursk-oblast",
  Belgorod: "russia-belgorod-oblast",
  "Voronezh Oblast": "russia-voronezh-oblast",
  "Rostov Oblast": "russia-rostov-oblast",
  "Republic of Buryatia": "russia-buryatia",
  "Tuva Republic": "russia-tuva",
  "Zabaykalsky Krai": "russia-zabaykalsky-krai",
  Amur: "russia-amur-oblast",
  Jewish: "russia-jewish-autonomous-oblast",
  "Khabarovsk Krai": "russia-khabarovsk-krai",
  "Primorsky Krai": "russia-primorsky-krai",
  "Tyumen Oblast": "russia-tyumen-oblast",
  Kurgan: "russia-kurgan-oblast",
  "Omsk Oblast": "russia-omsk-oblast",
  "Novosibirsk Oblast": "russia-novosibirsk-oblast",
  "Chelyabinsk Oblast": "russia-chelyabinsk-oblast",
  "Altai Republic": "russia-altai-republic",
  "Orenburg Oblast": "russia-orenburg-oblast",
  "Saratov Oblast": "russia-saratov-oblast",
  Astrakhan: "russia-astrakhan-oblast",
  "Volgograd Oblast": "russia-volgograd-oblast",
  "Autonomous Republic of Crimea": "russia-crimea",
  Magadan: "russia-magadan-oblast",
  Sakhalin: "russia-sakhalin-oblast",
  Sevastopol: "russia-sevastopol",
  "Chukotka Autonomous Okrug": "russia-chukotka",
  "Yamalo-Nenets Autonomous Okrug": "russia-yamalo-nenets",
  "Nenets Autonomous Okrug": "russia-nenets",
  "Sakha (Yakutia)": "russia-sakha",
  "Saint Petersburg": "russia-saint-petersburg",
  Arkhangelsk: "russia-arkhangelsk-oblast",
  "Krasnoyarsk Krai": "russia-krasnoyarsk-krai",
  "Republic of Kalmykia": "russia-kalmykia",
  "Kamchatka Krai": "russia-kamchatka-krai",
  "Republic of Bashkortostan": "russia-bashkortostan",
  "Sverdlovsk Oblast": "russia-sverdlovsk-oblast",
  "Khanty-Mansi Autonomous Okrug": "russia-khanty-mansi",
  Lipetsk: "russia-lipetsk-oblast",
  Tambov: "russia-tambov-oblast",
  Tomsk: "russia-tomsk-oblast",
  "Republic of Tatarstan": "russia-tatarstan",
  Ulyanovsk: "russia-ulyanovsk-oblast",
  Penza: "russia-penza-oblast",
  "Kemerovo Oblast": "russia-kemerovo-oblast",
  Oryol: "russia-oryol-oblast",
  "Irkutsk Oblast": "russia-irkutsk-oblast",
  "Republic of Khakassia": "russia-khakassia",
  "Republic of Mordovia": "russia-mordovia",
  Kaluga: "russia-kaluga-oblast",
  Kostroma: "russia-kostroma-oblast",
  Yaroslavl: "russia-yaroslavl-oblast",
  Vladimir: "russia-vladimir-oblast",
  Ryazan: "russia-ryazan-oblast",
  Ivanovo: "russia-ivanovo-oblast",
  "Nizhny Novgorod Oblast": "russia-nizhny-novgorod-oblast",
  Tula: "russia-tula-oblast",
  "Chuvash Republic": "russia-chuvashia",
  Vologda: "russia-vologda-oblast",
  Novgorod: "russia-novgorod-oblast",
  Tver: "russia-tver-oblast",
  "Moscow Oblast": "russia-moscow-oblast",
  Moscow: "russia-moscow",
  "Mari El Republic": "russia-mari-el",
  Kirov: "russia-kirov-oblast",
  "Udmurt Republic": "russia-udmurtia",
  "Komi Republic": "russia-komi",
  "Perm Krai": "russia-perm-krai",
  "Samara Oblast": "russia-samara-oblast",
  "Stavropol Krai": "russia-stavropol-krai",
  "Republic of Adygea": "russia-adygea",
};

const DISPLAY_NAMES: Record<string, string> = {
  "russia-chechnya": "Chechen Republic",
  "russia-tuva": "Tuva Republic",
  "russia-yamalo-nenets": "Yamalo-Nenets Autonomous Okrug",
  "russia-altai-republic": "Altai Republic",
  "russia-ingushetia": "Republic of Ingushetia",
  "russia-dagestan": "Republic of Dagestan",
  "russia-tyumen-oblast": "Tyumen Oblast",
  "russia-sakhalin-oblast": "Sakhalin Oblast",
  "russia-chukotka": "Chukotka Autonomous Okrug",
  "russia-nenets": "Nenets Autonomous Okrug",
  "russia-khanty-mansi": "Khanty-Mansi Autonomous Okrug",
  "russia-astrakhan-oblast": "Astrakhan Oblast",
  "russia-irkutsk-oblast": "Irkutsk Oblast",
  "russia-kabardino-balkaria": "Kabardino-Balkaria",
  "russia-north-ossetia": "North Ossetia–Alania",
  "russia-zabaykalsky-krai": "Zabaykalsky Krai",
  "russia-kamchatka-krai": "Kamchatka Krai",
  "russia-kurgan-oblast": "Kurgan Oblast",
  "russia-sverdlovsk-oblast": "Sverdlovsk Oblast",
  "russia-buryatia": "Republic of Buryatia",
  "russia-sakha": "Sakha (Yakutia)",
  "russia-komi": "Komi Republic",
  "russia-krasnodar-krai": "Krasnodar Krai",
  "russia-perm-krai": "Perm Krai",
  "russia-karelia": "Republic of Karelia",
  "russia-crimea": "Republic of Crimea",
  "russia-orenburg-oblast": "Orenburg Oblast",
  "russia-kostroma-oblast": "Kostroma Oblast",
  "russia-khakassia": "Republic of Khakassia",
  "russia-novosibirsk-oblast": "Novosibirsk Oblast",
  "russia-moscow": "Moscow",
  "russia-chelyabinsk-oblast": "Chelyabinsk Oblast",
  "russia-tatarstan": "Republic of Tatarstan",
  "russia-khabarovsk-krai": "Khabarovsk Krai",
  "russia-omsk-oblast": "Omsk Oblast",
  "russia-kirov-oblast": "Kirov Oblast",
  "russia-primorsky-krai": "Primorsky Krai",
  "russia-amur-oblast": "Amur Oblast",
  "russia-arkhangelsk-oblast": "Arkhangelsk Oblast",
  "russia-krasnoyarsk-krai": "Krasnoyarsk Krai",
  "russia-murmansk-oblast": "Murmansk Oblast",
  "russia-adygea": "Republic of Adygea",
  "russia-chuvashia": "Chuvash Republic",
  "russia-bashkortostan": "Republic of Bashkortostan",
  "russia-jewish-autonomous-oblast": "Jewish Autonomous Oblast",
  "russia-karachay-cherkessia": "Karachay-Cherkess Republic",
  "russia-udmurtia": "Udmurt Republic",
  "russia-moscow-oblast": "Moscow Oblast",
  "russia-vologda-oblast": "Vologda Oblast",
  "russia-kaluga-oblast": "Kaluga Oblast",
  "russia-mari-el": "Mari El Republic",
  "russia-samara-oblast": "Samara Oblast",
  "russia-ivanovo-oblast": "Ivanovo Oblast",
  "russia-rostov-oblast": "Rostov Oblast",
  "russia-pskov-oblast": "Pskov Oblast",
  "russia-kalmykia": "Republic of Kalmykia",
  "russia-nizhny-novgorod-oblast": "Nizhny Novgorod Oblast",
  "russia-yaroslavl-oblast": "Yaroslavl Oblast",
  "russia-ulyanovsk-oblast": "Ulyanovsk Oblast",
  "russia-stavropol-krai": "Stavropol Krai",
  "russia-tver-oblast": "Tver Oblast",
  "russia-saint-petersburg": "Saint Petersburg",
  "russia-kursk-oblast": "Kursk Oblast",
  "russia-altai-krai": "Altai Krai",
  "russia-magadan-oblast": "Magadan Oblast",
  "russia-novgorod-oblast": "Novgorod Oblast",
  "russia-voronezh-oblast": "Voronezh Oblast",
  "russia-kaliningrad-oblast": "Kaliningrad Oblast",
  "russia-oryol-oblast": "Oryol Oblast",
  "russia-lipetsk-oblast": "Lipetsk Oblast",
  "russia-kemerovo-oblast": "Kemerovo Oblast",
  "russia-tomsk-oblast": "Tomsk Oblast",
  "russia-tambov-oblast": "Tambov Oblast",
  "russia-penza-oblast": "Penza Oblast",
  "russia-bryansk-oblast": "Bryansk Oblast",
  "russia-vladimir-oblast": "Vladimir Oblast",
  "russia-tula-oblast": "Tula Oblast",
  "russia-ryazan-oblast": "Ryazan Oblast",
  "russia-volgograd-oblast": "Volgograd Oblast",
  "russia-belgorod-oblast": "Belgorod Oblast",
  "russia-saratov-oblast": "Saratov Oblast",
  "russia-smolensk-oblast": "Smolensk Oblast",
  "russia-sevastopol": "Sevastopol",
  "russia-mordovia": "Republic of Mordovia",
  "russia-leningrad-oblast": "Leningrad Oblast",
};

function kindFor(slug: string, name: string): string {
  if (slug === "russia-moscow" || slug === "russia-saint-petersburg" || slug === "russia-sevastopol") {
    return "federal-city";
  }
  if (slug.includes("autonomous-oblast") || name.includes("Autonomous Oblast")) {
    return "autonomous-oblast";
  }
  if (
    slug.includes("nenets") ||
    slug.includes("khanty") ||
    slug.includes("chukotka") ||
    name.includes("Autonomous Okrug")
  ) {
    return "autonomous-okrug";
  }
  if (slug.includes("krai") || name.includes("Krai")) return "krai";
  if (slug.includes("oblast") || name.includes("Oblast")) return "oblast";
  return "republic";
}

/** Embedded 2020–2025 TFR from Wikipedia (Rosstat). Skip national total. */
const WIKI_ROWS: { name: string; values: number[] }[] = [
  { name: "Chechnya", values: [2.57, 2.5, 2.74, 2.66, 2.71, 2.6] },
  { name: "Tuva", values: [2.97, 2.94, 2.51, 2.44, 2.31, 2.21] },
  { name: "Yamalo Nenets A.O.", values: [1.9, 1.89, 1.92, 1.95, 1.92, 2.01] },
  { name: "Altai Republic", values: [2.09, 2.08, 2.07, 2.03, 1.87, 1.78] },
  { name: "Ingushetia", values: [1.85, 1.87, 1.83, 1.81, 1.84, 1.75] },
  { name: "Dagestan", values: [1.87, 1.76, 1.73, 1.75, 1.82, 1.79] },
  { name: "Tyumen Oblast", values: [1.77, 1.78, 1.72, 1.72, 1.76, 1.73] },
  { name: "Sakhalin Oblast", values: [1.97, 1.94, 1.81, 1.74, 1.73, 1.69] },
  { name: "Chukotka", values: [1.76, 1.66, 1.66, 1.68, 1.69, 1.72] },
  { name: "Nenets Autonomous Okrug", values: [2.26, 2.07, 1.84, 1.91, 1.66, 1.62] },
  { name: "Khanty–Mansi A.O. (Yugra)", values: [1.78, 1.74, 1.67, 1.66, 1.65, 1.57] },
  { name: "Astrakhan Oblast", values: [1.73, 1.74, 1.63, 1.64, 1.62, 1.6] },
  { name: "Irkutsk Oblast", values: [1.7, 1.69, 1.69, 1.65, 1.62, 1.6] },
  { name: "Kabardino-Balkaria", values: [1.64, 1.67, 1.51, 1.53, 1.61, 1.58] },
  { name: "North Ossetia–Alania", values: [1.72, 1.71, 1.59, 1.52, 1.61, 1.55] },
  { name: "Zabaykalsky Krai", values: [1.75, 1.74, 1.69, 1.62, 1.58, 1.52] },
  { name: "Kamchatka Krai", values: [1.68, 1.6, 1.63, 1.67, 1.58, 1.57] },
  { name: "Kurgan Oblast", values: [1.63, 1.63, 1.68, 1.64, 1.55, 1.52] },
  { name: "Sverdlovsk Oblast", values: [1.6, 1.62, 1.56, 1.55, 1.52, 1.48] },
  { name: "Buryatia", values: [1.95, 1.87, 1.68, 1.6, 1.52, 1.48] },
  { name: "Sakha (Yakutia)", values: [1.86, 1.73, 1.62, 1.55, 1.52, 1.52] },
  { name: "Komi Republic", values: [1.57, 1.53, 1.53, 1.56, 1.51, 1.51] },
  { name: "Krasnodar Krai", values: [1.61, 1.64, 1.52, 1.53, 1.51, 1.5] },
  { name: "Perm Krai", values: [1.53, 1.56, 1.54, 1.53, 1.51, 1.45] },
  { name: "Karelia", values: [1.4, 1.43, 1.5, 1.53, 1.5, 1.51] },
  { name: "Republic of Crimea", values: [1.6, 1.58, 1.44, 1.42, 1.5, 1.48] },
  { name: "Orenburg Oblast", values: [1.55, 1.54, 1.46, 1.5, 1.47, 1.39] },
  { name: "Kostroma Oblast", values: [1.46, 1.38, 1.52, 1.55, 1.47, 1.4] },
  { name: "Khakassia", values: [1.57, 1.59, 1.54, 1.52, 1.46, 1.44] },
  { name: "Novosibirsk Oblast", values: [1.55, 1.57, 1.49, 1.49, 1.46, 1.43] },
  { name: "Moscow", values: [1.47, 1.6, 1.42, 1.42, 1.46, 1.43] },
  { name: "Chelyabinsk Oblast", values: [1.48, 1.53, 1.47, 1.47, 1.45, 1.39] },
  { name: "Tatarstan", values: [1.54, 1.57, 1.43, 1.45, 1.44, 1.44] },
  { name: "Khabarovsk Krai", values: [1.59, 1.58, 1.5, 1.46, 1.44, 1.4] },
  { name: "Omsk Oblast", values: [1.45, 1.46, 1.52, 1.5, 1.43, 1.42] },
  { name: "Kirov Oblast", values: [1.44, 1.44, 1.5, 1.47, 1.43, 1.43] },
  { name: "Primorsky Krai", values: [1.52, 1.51, 1.43, 1.44, 1.43, 1.39] },
  { name: "Amur Oblast", values: [1.54, 1.51, 1.46, 1.49, 1.42, 1.36] },
  { name: "Arkhangelsk Oblast", values: [1.39, 1.39, 1.49, 1.46, 1.41, 1.35] },
  { name: "Krasnoyarsk Krai", values: [1.5, 1.51, 1.43, 1.44, 1.41, 1.38] },
  { name: "Murmansk Oblast", values: [1.45, 1.39, 1.47, 1.45, 1.38, 1.32] },
  { name: "Adygea", values: [1.45, 1.52, 1.31, 1.35, 1.38, 1.38] },
  { name: "Chuvashia", values: [1.47, 1.48, 1.42, 1.4, 1.36, 1.33] },
  { name: "Bashkortostan", values: [1.52, 1.49, 1.41, 1.41, 1.36, 1.31] },
  { name: "Jewish Autonomous Oblast", values: [1.71, 1.66, 1.62, 1.56, 1.35, 1.39] },
  { name: "Karachay-Cherkessia", values: [1.53, 1.35, 1.3, 1.34, 1.35, 1.37] },
  { name: "Udmurtia", values: [1.52, 1.54, 1.43, 1.4, 1.35, 1.32] },
  { name: "Moscow Oblast", values: [1.53, 1.46, 1.33, 1.35, 1.34, 1.33] },
  { name: "Vologda Oblast", values: [1.53, 1.52, 1.41, 1.44, 1.33, 1.38] },
  { name: "Kaluga Oblast", values: [1.48, 1.44, 1.34, 1.34, 1.33, 1.27] },
  { name: "Mari El", values: [1.55, 1.53, 1.41, 1.38, 1.33, 1.35] },
  { name: "Samara Oblast", values: [1.38, 1.42, 1.33, 1.33, 1.31, 1.3] },
  { name: "Ivanovo Oblast", values: [1.24, 1.26, 1.37, 1.35, 1.3, 1.26] },
  { name: "Rostov Oblast", values: [1.35, 1.36, 1.25, 1.27, 1.29, 1.27] },
  { name: "Pskov Oblast", values: [1.43, 1.49, 1.33, 1.3, 1.29, 1.26] },
  { name: "Kalmykia", values: [1.53, 1.52, 1.43, 1.44, 1.28, 1.2] },
  { name: "Nizhny Novgorod Oblast", values: [1.35, 1.32, 1.31, 1.31, 1.28, 1.31] },
  { name: "Yaroslavl Oblast", values: [1.36, 1.36, 1.31, 1.32, 1.27, 1.23] },
  { name: "Ulyanovsk Oblast", values: [1.39, 1.4, 1.32, 1.34, 1.27, 1.23] },
  { name: "Stavropol Krai", values: [1.43, 1.42, 1.29, 1.3, 1.26, 1.24] },
  { name: "Tver Oblast", values: [1.36, 1.31, 1.3, 1.28, 1.26, 1.24] },
  { name: "Saint Petersburg", values: [1.37, 1.38, 1.28, 1.26, 1.26, 1.25] },
  { name: "Kursk Oblast", values: [1.35, 1.34, 1.29, 1.26, 1.24, 1.2] },
  { name: "Altai Krai", values: [1.42, 1.4, 1.35, 1.3, 1.24, 1.2] },
  { name: "Magadan Oblast", values: [1.51, 1.41, 1.43, 1.34, 1.23, 1.25] },
  { name: "Novgorod Oblast", values: [1.38, 1.35, 1.32, 1.26, 1.22, 1.2] },
  { name: "Voronezh Oblast", values: [1.27, 1.29, 1.23, 1.22, 1.21, 1.22] },
  { name: "Kaliningrad Oblast", values: [1.4, 1.38, 1.26, 1.39, 1.2, 1.22] },
  { name: "Oryol Oblast", values: [1.27, 1.22, 1.21, 1.17, 1.18, 1.12] },
  { name: "Lipetsk Oblast", values: [1.38, 1.34, 1.2, 1.23, 1.18, 1.16] },
  { name: "Kemerovo Oblast", values: [1.37, 1.34, 1.26, 1.22, 1.17, 1.13] },
  { name: "Tomsk Oblast", values: [1.27, 1.25, 1.24, 1.19, 1.16, 1.15] },
  { name: "Tambov Oblast", values: [1.28, 1.28, 1.22, 1.21, 1.16, 1.15] },
  { name: "Penza Oblast", values: [1.23, 1.24, 1.19, 1.2, 1.15, 1.13] },
  { name: "Bryansk Oblast", values: [1.31, 1.28, 1.2, 1.19, 1.14, 1.11] },
  { name: "Vladimir Oblast", values: [1.27, 1.28, 1.16, 1.15, 1.14, 1.06] },
  { name: "Tula Oblast", values: [1.25, 1.22, 1.15, 1.18, 1.14, 1.13] },
  { name: "Ryazan Oblast", values: [1.31, 1.24, 1.14, 1.1, 1.12, 1.13] },
  { name: "Volgograd Oblast", values: [1.25, 1.28, 1.14, 1.12, 1.12, 1.1] },
  { name: "Belgorod Oblast", values: [1.24, 1.27, 1.17, 1.12, 1.07, 1.08] },
  { name: "Saratov Oblast", values: [1.23, 1.24, 1.11, 1.1, 1.06, 1.08] },
  { name: "Smolensk Oblast", values: [1.16, 1.13, 1.08, 1.03, 1.05, 1.01] },
  { name: "Sevastopol", values: [1.27, 1.25, 1.02, 0.98, 1.0, 1.08] },
  { name: "Mordovia", values: [1.12, 1.11, 1.03, 1.05, 0.99, 1.04] },
  { name: "Leningrad Oblast", values: [1.06, 1.04, 0.87, 0.88, 0.89, 0.91] },
];

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

function main() {
  const demo = JSON.parse(fs.readFileSync(DEMO_PATH, "utf8")) as {
    updated: string;
    sources: Record<string, unknown>;
    divisions: {
      iso3: string;
      slug: string;
      name: string;
      kind: string;
      code: string | null;
    }[];
    fertility: Record<string, { year: number; value: number }[]>;
    population: Record<string, { year: number; value: number }[]>;
    generalFertilityRate: Record<string, { year: number; value: number }[]>;
  };

  const geo = JSON.parse(fs.readFileSync(GEO_PATH, "utf8")) as {
    type: string;
    features: {
      type: string;
      properties: { name: string; slug: string | null; iso3?: string };
      geometry: unknown;
    }[];
  };

  // Patch geo slugs
  let geoPatched = 0;
  let geoUnknown = 0;
  for (const f of geo.features) {
    const name = f.properties.name;
    const slug = GEO_NAME_TO_SLUG[name];
    if (slug) {
      f.properties.slug = slug;
      f.properties.iso3 = "RUS";
      geoPatched += 1;
    } else if (name === "Unknown") {
      geoUnknown += 1;
    } else {
      console.warn("unmapped geo feature:", name);
    }
  }

  // Build fertility series from wiki
  const unmatchedWiki: string[] = [];
  const fertilityBySlug: Record<string, { year: number; value: number }[]> = {};
  for (const row of WIKI_ROWS) {
    const slug = WIKI_TO_SLUG[row.name];
    if (!slug) {
      unmatchedWiki.push(row.name);
      continue;
    }
    fertilityBySlug[slug] = YEARS.map((year, i) => ({
      year,
      value: row.values[i],
    }));
  }

  // Replace RUS divisions
  const nonRus = demo.divisions.filter((d) => d.iso3 !== "RUS");
  const rusDivisions = Object.keys(fertilityBySlug)
    .sort()
    .map((slug) => {
      const name = DISPLAY_NAMES[slug] ?? slug;
      return {
        iso3: "RUS",
        slug,
        name,
        kind: kindFor(slug, name),
        code: null as string | null,
      };
    });

  // Wipe old russia-* fertility keys, write new
  for (const key of Object.keys(demo.fertility)) {
    if (key.startsWith("russia-")) delete demo.fertility[key];
  }
  Object.assign(demo.fertility, fertilityBySlug);

  demo.divisions = [...nonRus, ...rusDivisions];
  demo.updated = new Date().toISOString().slice(0, 10);
  demo.sources.RUS = {
    fertility:
      "Rosstat — total fertility rate by federal subject (Суммарный коэффициент рождаемости), via Wikipedia compilation 2020–2025",
    fertilityUrl:
      "https://en.wikipedia.org/wiki/List_of_federal_subjects_of_Russia_by_total_fertility_rate",
    population: "Rosstat estimated resident population of federal subjects",
    populationUrl: "https://rosstat.gov.ru",
  };

  fs.writeFileSync(DEMO_PATH, JSON.stringify(demo, null, 2) + "\n");
  fs.writeFileSync(GEO_PATH, JSON.stringify(geo));

  const slugbed = geo.features.filter((f) => f.properties.slug).length;
  console.log({
    wikiRows: WIKI_ROWS.length,
    fertilitySeries: Object.keys(fertilityBySlug).length,
    rusDivisions: rusDivisions.length,
    geoPatched,
    geoWithSlug: slugbed,
    geoUnknown,
    unmatchedWiki,
  });
}

main();
