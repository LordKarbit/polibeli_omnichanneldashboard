import { badRequest, ok, serverError } from "@/server/api/http";
import { requireApiPermission } from "@/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NominatimAddress = Record<string, string | undefined>;

type NominatimReverseResponse = {
  name?: string;
  display_name?: string;
  category?: string;
  type?: string;
  address?: NominatimAddress;
};

type ReverseLookup = {
  title: string;
  address: string;
  category: string | null;
};

const reverseCache = new Map<string, ReverseLookup>();
const MAX_CACHE_ENTRIES = 600;

function roundedCoordinate(value: number) {
  return Number(value.toFixed(5));
}

function coordinateCacheKey(lat: number, lon: number) {
  return `${roundedCoordinate(lat)},${roundedCoordinate(lon)}`;
}

function firstText(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean) ?? null;
}

function compactAddress(address?: NominatimAddress, displayName?: string) {
  if (!address) return displayName?.trim() || "Address unavailable";

  const parts = [
    firstText(address.house_number, address.road),
    firstText(address.neighbourhood, address.suburb, address.village),
    firstText(address.city, address.town, address.municipality, address.county),
    firstText(address.state),
  ].filter((value): value is string => Boolean(value));

  return parts.length ? Array.from(new Set(parts)).join(", ") : displayName?.trim() || "Address unavailable";
}

function titleFromResponse(payload: NominatimReverseResponse) {
  const address = payload.address;
  return (
    firstText(
      payload.name,
      address?.building,
      address?.amenity,
      address?.shop,
      address?.office,
      address?.tourism,
      address?.leisure,
      address?.road,
    ) ?? "Building footprint"
  );
}

function setCached(key: string, value: ReverseLookup) {
  reverseCache.set(key, value);

  if (reverseCache.size <= MAX_CACHE_ENTRIES) return;

  const oldestKey = reverseCache.keys().next().value as string | undefined;
  if (oldestKey) reverseCache.delete(oldestKey);
}

export async function GET(request: Request) {
  const access = await requireApiPermission("viewGeo", request);
  if (access instanceof Response) return access;

  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return badRequest("Invalid coordinate.");
  }

  const cacheKey = coordinateCacheKey(lat, lon);
  const cached = reverseCache.get(cacheKey);
  if (cached) return ok(cached);

  try {
    const lookupUrl = new URL("https://nominatim.openstreetmap.org/reverse");
    lookupUrl.searchParams.set("format", "jsonv2");
    lookupUrl.searchParams.set("lat", String(roundedCoordinate(lat)));
    lookupUrl.searchParams.set("lon", String(roundedCoordinate(lon)));
    lookupUrl.searchParams.set("zoom", "18");
    lookupUrl.searchParams.set("addressdetails", "1");
    lookupUrl.searchParams.set("accept-language", "id,en");

    const response = await fetch(lookupUrl, {
      headers: {
        "User-Agent": "PolibeliOmnichannelDashboard/1.0 (local analytics map)",
        Accept: "application/json",
      },
      next: { revalidate: 60 * 60 * 24 * 14 },
    });

    if (!response.ok) {
      throw new Error(`Reverse geocode failed with ${response.status}`);
    }

    const payload = (await response.json()) as NominatimReverseResponse;
    const data: ReverseLookup = {
      title: titleFromResponse(payload),
      address: compactAddress(payload.address, payload.display_name),
      category: firstText(payload.category, payload.type),
    };

    setCached(cacheKey, data);
    return ok(data);
  } catch (error) {
    return serverError(error);
  }
}
