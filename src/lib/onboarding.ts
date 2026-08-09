export type OnboardingGenre = {
  id: string;
  label: string;
  emoji: string;
};

export const ONBOARDING_GENRES: OnboardingGenre[] = [
  { id: "thrash", label: "THRASH", emoji: "⚡" },
  { id: "death", label: "DEATH", emoji: "💀" },
  { id: "black", label: "BLACK", emoji: "🐺" },
  { id: "doom", label: "DOOM", emoji: "⛓️" },
  { id: "power", label: "POWER", emoji: "🔥" },
  { id: "progressive", label: "PROGRESSIVE", emoji: "🎸" },
  { id: "all", label: "ALL METAL", emoji: "🤘" },
];

export const AVATAR_OPTIONS = ["💀", "🎸", "🔥", "⚡", "🐺", "⛓️", "🤘", "🦇"];

export type OnboardingCountry = {
  code: string;
  name: string;
};

export const ONBOARDING_COUNTRIES: OnboardingCountry[] = [
  { code: "DE", name: "Germany" },
  { code: "US", name: "United States" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "FI", name: "Finland" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "GB", name: "United Kingdom" },
  { code: "JP", name: "Japan" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "PL", name: "Poland" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
];

export function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

const SUGGESTION_PREFIXES = ["TrveKvlt_", "MetalGod_", "Poseur_Slayer_"];

export function generateUsernameSuggestions(): string[] {
  return SUGGESTION_PREFIXES.map((prefix) => `${prefix}${Math.floor(1000 + Math.random() * 9000)}`);
}

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
