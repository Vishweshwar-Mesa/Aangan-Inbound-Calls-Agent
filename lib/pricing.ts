// Internal pricing bands from pricing.md. These numbers must NEVER reach a
// caller-facing surface — only the designer's brief, labelled
// "internal — never share" (CLAUDE.md hard rule).

export type PropertyKind = "residential" | "commercial";

interface PricingBand {
  tier: string;
  minPerSqft: number;
  maxPerSqft: number | null; // null means open-ended ("+")
}

const RESIDENTIAL_BANDS: PricingBand[] = [
  { tier: "standard", minPerSqft: 1800, maxPerSqft: 2400 },
  { tier: "premium", minPerSqft: 2400, maxPerSqft: 3500 },
  { tier: "luxury", minPerSqft: 3500, maxPerSqft: null },
];

const COMMERCIAL_BANDS: PricingBand[] = [
  { tier: "basic", minPerSqft: 1200, maxPerSqft: 1800 },
  { tier: "mid", minPerSqft: 1800, maxPerSqft: 2800 },
  { tier: "premium", minPerSqft: 2800, maxPerSqft: 4000 },
];

export interface IndicativeRange {
  tier: string;
  lowInr: number;
  highInr: number | null;
}

export function inferPropertyKind(propertyType: string | null): PropertyKind {
  if (!propertyType) return "residential";
  return /office|commercial|retail|shop|coworking/i.test(propertyType)
    ? "commercial"
    : "residential";
}

// All tier ranges for the property's carpet area — the brief picks whichever
// tier best fits the scope/flags rather than us guessing a single one here.
export function estimateRanges(
  kind: PropertyKind,
  carpetAreaSqft: number | null,
): IndicativeRange[] | null {
  if (!carpetAreaSqft) return null;
  const bands = kind === "residential" ? RESIDENTIAL_BANDS : COMMERCIAL_BANDS;
  return bands.map((band) => ({
    tier: band.tier,
    lowInr: Math.round(band.minPerSqft * carpetAreaSqft),
    highInr: band.maxPerSqft ? Math.round(band.maxPerSqft * carpetAreaSqft) : null,
  }));
}
