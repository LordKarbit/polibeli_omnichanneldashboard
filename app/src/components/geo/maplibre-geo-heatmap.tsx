"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent, StyleSpecification } from "maplibre-gl";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Filter,
  Flame,
  Layers,
  ListFilter,
  MapPin,
  Minus,
  Orbit,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  Sun,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import type { LocationGMV } from "@/data/mock/types";
import type { GeoTransactionSummary } from "@/lib/dashboard-client";
import { abbreviateIDR, formatIDR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type CityBounds = [number, number, number, number];
type BoundaryLevel = "city" | "subdistrict";
type MetricMode = "gmv" | "cancellation";
type GeoJsonLayerConstructor = new (props: Record<string, unknown>) => unknown;
type DeckOverlay = {
  setProps: (props: { layers: unknown[] }) => void;
  finalize?: () => void;
};

interface ChannelBreakdown {
  channel: string;
  gmv: number;
  orders: number;
}

interface ChannelOption {
  key: string;
  label: string;
}

interface CityBoundaryProperties {
  id?: string;
  level?: BoundaryLevel;
  name?: string;
  sourceName?: string;
  province?: string;
  provinceKey?: string;
  cityName?: string;
  citySourceName?: string;
  cityKey?: string;
  adminKey?: string;
  sourceKey?: string;
  districtKey?: string;
  center?: [number, number];
  bbox?: CityBounds;
  matchedLooseCity?: boolean;
  matchedDistrictKeys?: string[];
  totalGMV?: number;
  totalOrders?: number;
  channels?: ChannelBreakdown[];
}

interface SalesAggregate {
  totalGMV: number;
  totalOrders: number;
  channels: Map<string, ChannelBreakdown>;
}

type SubdistrictLookup = Map<string, Set<string>>;

interface HoverState {
  x: number;
  y: number;
  properties: CityBoundaryProperties;
}

interface SelectedBoundaryDetail {
  properties: CityBoundaryProperties;
  level: BoundaryLevel;
}

interface PopupChannelDetail {
  channel: string;
  channelKey: string;
  gmv: number;
  orders: number;
}

interface PopupManagerDetail {
  manager: string;
  gmv: number;
  orders: number;
}

interface PopupSalesDetail {
  manager: string;
  salesName: string;
  gmv: number;
  orders: number;
}

interface PopupTransactionDetail {
  orderKey: string;
  sourceOrderId: string;
  customer: string;
  channel: string;
  channelKey: string;
  areaManager: string | null;
  regionalManager: string | null;
  salesName: string | null;
  date: string | null;
  status: string;
  gmv: number;
}

interface BoundaryTransactionDetail {
  title: string;
  subtitle: string;
  totalGMV: number;
  totalOrders: number;
  channels: PopupChannelDetail[];
  areaManagers: PopupManagerDetail[];
  sales: PopupSalesDetail[];
  transactions: PopupTransactionDetail[];
}

interface MapLibreGeoHeatmapProps {
  locations: LocationGMV[];
  transactions?: GeoTransactionSummary[];
  className?: string;
}

const CITY_BOUNDARY_URL = "/data/geo-sales-city-boundaries.geojson";
const SUBDISTRICT_BOUNDARY_URL = "/data/geo-sales-subdistrict-boundaries.geojson";
const INDONESIA_BOUNDS: CityBounds = [94.2, -11.4, 141.2, 6.4];
const HOVER_SOURCE_ID = "geo-sales-active-boundaries-hit-source";
const HOVER_LAYER_ID = "geo-sales-active-boundaries-hit-fill";
const DATA_VIEW_PADDING = { top: 56, right: 56, bottom: 56, left: 56 };
const DEFAULT_MAP_PITCH = 18;

const TOP_CHANNEL_OPTIONS: ChannelOption[] = [
  { key: "gt", label: "GT" },
  { key: "mt", label: "MT" },
  { key: "marketplace", label: "Marketplace" },
];

const MARKETPLACE_CHANNEL_OPTIONS: ChannelOption[] = [
  { key: "shopee", label: "Shopee" },
  { key: "tiktok1", label: "TikTok ID" },
  { key: "tiktok2", label: "TikTok Card" },
];
const MARKETPLACE_CHANNEL_KEYS = MARKETPLACE_CHANNEL_OPTIONS.map((channel) => channel.key);

const METRIC_OPTIONS: Array<{ key: MetricMode; label: string }> = [
  { key: "gmv", label: "GMV" },
  { key: "cancellation", label: "Value Cancellation" },
];

const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "OpenStreetMap, CARTO",
    },
    clearMap: {
      type: "raster",
      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "OpenStreetMap",
    },
  },
  layers: [
    {
      id: "geo-background",
      type: "background",
      paint: {
        "background-color": "#020617",
      },
    },
    {
      id: "osm-basemap",
      type: "raster",
      source: "osm",
      paint: {
        "raster-opacity": 1,
        "raster-saturation": -0.78,
        "raster-contrast": 0.18,
        "raster-brightness-min": 0.08,
        "raster-brightness-max": 0.62,
      },
    },
    {
      id: "clear-basemap",
      type: "raster",
      source: "clearMap",
      paint: {
        "raster-opacity": 0,
        "raster-saturation": 0,
        "raster-contrast": 0,
        "raster-brightness-min": 0,
        "raster-brightness-max": 1,
      },
    },
  ],
};

const PROVINCE_ALIASES: Record<string, string> = {
  "bangka belitung": "kepulauan bangka belitung",
  "central java": "jawa tengah",
  "central java province": "jawa tengah",
  "central kalimantan": "kalimantan tengah",
  "central sulawesi": "sulawesi tengah",
  "d i aceh": "aceh",
  "d i yogyakarta": "di yogyakarta",
  "dki jakarta": "dki jakarta",
  "daerah istimewa yogyakarta": "di yogyakarta",
  "daerah khusus ibukota jakarta": "dki jakarta",
  "east java": "jawa timur",
  "east kalimantan": "kalimantan timur",
  "gorontalo province": "gorontalo",
  jakarta: "dki jakarta",
  "jakarta raya": "dki jakarta",
  "north kalimantan": "kalimantan utara",
  "north maluku": "maluku utara",
  "north sulawesi": "sulawesi utara",
  "north sumatra": "sumatera utara",
  "riau islands": "kepulauan riau",
  "south kalimantan": "kalimantan selatan",
  "south sulawesi": "sulawesi selatan",
  "south sumatra": "sumatera selatan",
  "southeast sulawesi": "sulawesi tenggara",
  "west java": "jawa barat",
  "west java province": "jawa barat",
  "west kalimantan": "kalimantan barat",
  "west nusa tenggara": "nusa tenggara barat",
  "west papua": "papua barat",
  "west sulawesi": "sulawesi barat",
  "west sumatra": "sumatera barat",
  yogyakarta: "di yogyakarta",
};

const CITY_ALIASES: Record<string, string> = {
  "central jakarta": "jakarta pusat",
  "east jakarta": "jakarta timur",
  "kab ciamis": "ciamis",
  "kecamatan garut": "garut",
  "kecamatan garut kota": "garut",
  palangkaraya: "palangka raya",
  "south jakarta": "jakarta selatan",
  "south tangerang": "tangerang selatan",
  "south tangerang city": "tangerang selatan",
  "surakarta solo": "surakarta",
  "tanjung pinang": "tanjungpinang",
  "waringin barat": "kotawaringin barat",
  "west bandung": "bandung barat",
  "west jakarta": "jakarta barat",
};

function compactKey(value: string) {
  return value
    .toLowerCase()
    .replace(/\+/g, " ")
    .replace(/&/g, " ")
    .replace(/[().,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeProvinceKey(value: string) {
  const base = compactKey(value)
    .replace(/\bprovince\b/g, "")
    .replace(/\bprovinsi\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return PROVINCE_ALIASES[base] ?? base;
}

function normalizeCityDirections(value: string) {
  let text = value;

  Object.entries(CITY_ALIASES).forEach(([from, to]) => {
    text = text.replace(new RegExp(`\\b${from}\\b`, "g"), to);
  });

  return text.replace(/\s+/g, " ").trim();
}

function normalizeAdminKey(value: string) {
  let text = compactKey(value)
    .replace(/\bcity\b/g, "kota")
    .replace(/\bregency\b/g, "kabupaten")
    .replace(/\bkab\b/g, "kabupaten")
    .replace(/\bkota administrasi\b/g, "kota");

  text = normalizeCityDirections(text);
  return text.replace(/\s+/g, " ").trim();
}

function normalizeCityKey(value: string) {
  const adminKey = normalizeAdminKey(value)
    .replace(/\b(kecamatan|regency|city|kabupaten|kota|administrasi)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalizeCityDirections(adminKey);
}

function normalizeDistrictKey(value?: string | null) {
  if (!value) return "";

  return compactKey(value)
    .replace(/\b(kecamatan|kec|district|subdistrict)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function districtKeyVariants(value?: string | null) {
  const districtKey = normalizeDistrictKey(value);
  if (!districtKey) return [];

  return Array.from(new Set([districtKey, districtKey.replace(/\s+/g, "")]));
}

function hasAdminQualifier(value: string) {
  return /\b(kota|kab\.?|kabupaten|city|regency)\b/i.test(value);
}

function inferChannelKey(location: LocationGMV) {
  if (location.channelKey) return location.channelKey;

  const source = compactKey(location.source);
  if (source.includes("b2b gt") || source === "gt") return "gt";
  if (source.includes("b2b mt") || source.includes("agency") || source === "mt") return "mt";
  if (source.includes("shopee")) return "shopee";
  if (source.includes("card")) return "tiktok2";
  if (source.includes("tiktok")) return "tiktok1";
  return source || "unknown";
}

function channelLabel(key: string) {
  return (
    TOP_CHANNEL_OPTIONS.find((channel) => channel.key === key)?.label ??
    MARKETPLACE_CHANNEL_OPTIONS.find((channel) => channel.key === key)?.label ??
    key
  );
}

function channelGroupKey(key: string) {
  return MARKETPLACE_CHANNEL_KEYS.includes(key) ? "marketplace" : key;
}

function getLocationMetric(location: LocationGMV, metricMode: MetricMode) {
  return metricMode === "cancellation" ? (location.cancellationValue ?? 0) : location.gmv;
}

function boundaryFeatureId(feature: Feature<Geometry, CityBoundaryProperties>) {
  const properties = feature.properties ?? {};
  return properties.id ?? `${properties.provinceKey}|${properties.adminKey}|${properties.name}`;
}

function boundarySubdistrictLookupKey(properties: CityBoundaryProperties) {
  const provinceKey = properties.provinceKey ?? normalizeProvinceKey(properties.province ?? "");
  const cityKey = properties.cityKey ?? normalizeCityKey(properties.citySourceName ?? properties.sourceName ?? properties.cityName ?? properties.name ?? "");
  const adminKey = properties.adminKey ?? normalizeAdminKey(properties.cityName ?? properties.name ?? "");

  return `${provinceKey}|${cityKey}|${adminKey}`;
}

function buildSubdistrictLookup(boundaries: FeatureCollection<Geometry, CityBoundaryProperties> | null): SubdistrictLookup {
  const lookup: SubdistrictLookup = new Map();

  boundaries?.features.forEach((feature) => {
    const properties = feature.properties ?? {};
    const districtKeys = districtKeyVariants(properties.districtKey ?? properties.sourceName ?? properties.name);
    if (!districtKeys.length) return;

    const key = boundarySubdistrictLookupKey(properties);
    const current = lookup.get(key) ?? new Set<string>();

    districtKeys.forEach((districtKey) => current.add(districtKey));
    lookup.set(key, current);
  });

  return lookup;
}

function createAggregate() {
  return {
    totalGMV: 0,
    totalOrders: 0,
    channels: new Map<string, ChannelBreakdown>(),
  };
}

function addLocationAggregate(
  target: Map<string, SalesAggregate>,
  key: string,
  location: LocationGMV,
  metricMode: MetricMode,
) {
  const metricValue = getLocationMetric(location, metricMode);
  const current = target.get(key) ?? createAggregate();
  const channel = location.source;
  const channelCurrent = current.channels.get(channel) ?? {
    channel,
    gmv: 0,
    orders: 0,
  };

  current.totalGMV += metricValue;
  current.totalOrders += location.orders;
  channelCurrent.gmv += metricValue;
  channelCurrent.orders += location.orders;
  current.channels.set(channel, channelCurrent);
  target.set(key, current);
}

function cityHasDistrict(city: CityBoundaryProperties, districtKey: string, subdistrictLookup?: SubdistrictLookup) {
  if (!districtKey) return false;

  const districts = subdistrictLookup?.get(boundarySubdistrictLookupKey(city));
  return districtKeyVariants(districtKey).some((variant) => districts?.has(variant)) ?? false;
}

function locationMatchesCityBoundary(
  location: LocationGMV,
  city: CityBoundaryProperties,
  subdistrictLookup?: SubdistrictLookup,
) {
  const provinceKey = normalizeProvinceKey(location.province);
  const cityKey = normalizeCityKey(location.city);
  const adminKey = normalizeAdminKey(location.city);
  const districtKeys = districtKeyVariants(location.district);
  const targetProvinceKey = city.provinceKey ?? normalizeProvinceKey(city.province ?? "");
  const targetCityKey = city.cityKey ?? normalizeCityKey(city.sourceName ?? city.name ?? "");
  const targetAdminKey = city.adminKey ?? normalizeAdminKey(city.name ?? "");

  if (!provinceKey || !cityKey || provinceKey !== targetProvinceKey || cityKey !== targetCityKey) {
    return false;
  }

  if (hasAdminQualifier(location.city)) {
    return adminKey === targetAdminKey;
  }

  if (districtKeys.some((districtKey) => cityHasDistrict(city, districtKey, subdistrictLookup))) {
    return true;
  }

  if (districtKeys.length && city.matchedDistrictKeys?.length) {
    return districtKeys.some((districtKey) => city.matchedDistrictKeys?.includes(districtKey));
  }

  return Boolean(city.matchedLooseCity);
}

function mergeAggregates(primary?: SalesAggregate, secondary?: SalesAggregate) {
  if (!primary) return secondary;
  if (!secondary) return primary;

  const merged = createAggregate();
  [primary, secondary].forEach((aggregate) => {
    merged.totalGMV += aggregate.totalGMV;
    merged.totalOrders += aggregate.totalOrders;
    aggregate.channels.forEach((channel) => {
      const current = merged.channels.get(channel.channel) ?? {
        channel: channel.channel,
        gmv: 0,
        orders: 0,
      };
      current.gmv += channel.gmv;
      current.orders += channel.orders;
      merged.channels.set(channel.channel, current);
    });
  });

  return merged;
}

function chooseLooseFeature(features: Feature<Geometry, CityBoundaryProperties>[], cityKey: string) {
  return (
    features.find((feature) => feature.properties?.sourceKey === cityKey) ??
    features.find((feature) => feature.properties?.adminKey?.startsWith("kabupaten ")) ??
    features[0]
  );
}

function chooseLooseFeatureForLocation(
  features: Feature<Geometry, CityBoundaryProperties>[],
  cityKey: string,
  location: LocationGMV,
  subdistrictLookup?: SubdistrictLookup,
) {
  const districtKeys = districtKeyVariants(location.district);

  if (districtKeys.length && subdistrictLookup?.size) {
    const districtMatches = features.filter((feature) =>
      districtKeys.some((districtKey) =>
        subdistrictLookup.get(boundarySubdistrictLookupKey(feature.properties ?? {}))?.has(districtKey),
      ),
    );

    if (districtMatches.length === 1) {
      return districtMatches[0];
    }

    if (districtMatches.length > 1) {
      return chooseLooseFeature(districtMatches, cityKey);
    }
  }

  return chooseLooseFeature(features, cityKey);
}

function buildActiveBoundaries(
  boundaries: FeatureCollection<Geometry, CityBoundaryProperties> | null,
  locations: LocationGMV[],
  metricMode: MetricMode,
  subdistrictLookup?: SubdistrictLookup,
): FeatureCollection<Geometry, CityBoundaryProperties> {
  if (!boundaries) {
    return { type: "FeatureCollection", features: [] };
  }

  const boundariesByLooseKey = boundaries.features.reduce((map, feature) => {
    const properties = feature.properties ?? {};
    const provinceKey = properties.provinceKey ?? normalizeProvinceKey(properties.province ?? "");
    const cityKey = properties.cityKey ?? normalizeCityKey(properties.sourceName ?? properties.name ?? "");
    const key = `${provinceKey}|${cityKey}`;
    const current = map.get(key) ?? [];

    current.push(feature);
    map.set(key, current);
    return map;
  }, new Map<string, Feature<Geometry, CityBoundaryProperties>[]>());
  const exactAggregates = new Map<string, SalesAggregate>();
  const resolvedLooseAggregates = new Map<string, SalesAggregate>();
  const resolvedLooseDistricts = new Map<string, Set<string>>();

  locations.forEach((location) => {
    if (getLocationMetric(location, metricMode) <= 0) return;

    const provinceKey = normalizeProvinceKey(location.province);
    const cityKey = normalizeCityKey(location.city);
    const adminKey = normalizeAdminKey(location.city);

    if (!provinceKey || !cityKey || cityKey === "agency") {
      return;
    }

    if (hasAdminQualifier(location.city)) {
      addLocationAggregate(exactAggregates, `${provinceKey}|${adminKey}`, location, metricMode);
    } else {
      const looseKey = `${provinceKey}|${cityKey}`;
      const districtKeys = districtKeyVariants(location.district);
      const candidate = chooseLooseFeatureForLocation(
        boundariesByLooseKey.get(looseKey) ?? [],
        cityKey,
        location,
        subdistrictLookup,
      );

      if (!candidate) {
        return;
      }

      const featureId = boundaryFeatureId(candidate);
      addLocationAggregate(resolvedLooseAggregates, featureId, location, metricMode);
      if (districtKeys.length) {
        const current = resolvedLooseDistricts.get(featureId) ?? new Set<string>();
        districtKeys.forEach((districtKey) => current.add(districtKey));
        resolvedLooseDistricts.set(featureId, current);
      }
    }
  });

  const features = boundaries.features.flatMap((feature) => {
    const properties = feature.properties ?? {};
    const provinceKey = properties.provinceKey ?? normalizeProvinceKey(properties.province ?? "");
    const adminKey = properties.adminKey ?? normalizeAdminKey(properties.name ?? "");
    const exactKey = `${provinceKey}|${adminKey}`;
    const featureId = boundaryFeatureId(feature);
    const looseAggregate = resolvedLooseAggregates.get(featureId);
    const matchedLooseCity = Boolean(looseAggregate);
    const aggregate = mergeAggregates(exactAggregates.get(exactKey), looseAggregate);

    if (!aggregate || aggregate.totalGMV <= 0) {
      return [];
    }

    return {
      ...feature,
      properties: {
        ...properties,
        matchedLooseCity,
        matchedDistrictKeys: Array.from(resolvedLooseDistricts.get(featureId) ?? []),
        totalGMV: aggregate.totalGMV,
        totalOrders: aggregate.totalOrders,
        channels: Array.from(aggregate.channels.values()).sort((a, b) => b.gmv - a.gmv),
      },
    };
  });

  return { ...boundaries, features };
}

function buildActiveSubdistrictBoundaries(
  boundaries: FeatureCollection<Geometry, CityBoundaryProperties> | null,
  locations: LocationGMV[],
  city: CityBoundaryProperties | null,
  metricMode: MetricMode,
  subdistrictLookup?: SubdistrictLookup,
): FeatureCollection<Geometry, CityBoundaryProperties> {
  if (!boundaries || !city) {
    return { type: "FeatureCollection", features: [] };
  }

  const districtAggregates = new Map<string, SalesAggregate>();

  locations.forEach((location) => {
    if (getLocationMetric(location, metricMode) <= 0 || (location.channelKey ?? inferChannelKey(location)) !== "gt") return;
    if (!locationMatchesCityBoundary(location, city, subdistrictLookup)) return;

    const districtKeys = districtKeyVariants(location.district).filter((districtKey) => districtKey !== "unknown");
    if (!districtKeys.length) return;

    districtKeys.forEach((districtKey) => addLocationAggregate(districtAggregates, districtKey, location, metricMode));
  });

  const targetProvinceKey = city.provinceKey ?? normalizeProvinceKey(city.province ?? "");
  const targetCityKey = city.cityKey ?? normalizeCityKey(city.sourceName ?? city.name ?? "");
  const targetAdminKey = city.adminKey ?? normalizeAdminKey(city.name ?? "");

  const features = boundaries.features.flatMap((feature) => {
    const properties = feature.properties ?? {};
    const provinceKey = properties.provinceKey ?? normalizeProvinceKey(properties.province ?? "");
    const cityKey = properties.cityKey ?? normalizeCityKey(properties.citySourceName ?? properties.cityName ?? "");
    const adminKey = properties.adminKey ?? normalizeAdminKey(properties.cityName ?? "");
    const districtKeys = districtKeyVariants(properties.districtKey ?? properties.sourceName ?? properties.name);

    if (provinceKey !== targetProvinceKey || cityKey !== targetCityKey) {
      return [];
    }

    if (targetAdminKey && adminKey && adminKey !== targetAdminKey) {
      return [];
    }

    const aggregate = districtKeys.map((districtKey) => districtAggregates.get(districtKey)).find(Boolean);
    if (!aggregate || aggregate.totalGMV <= 0) {
      return [];
    }

    return {
      ...feature,
      properties: {
        ...properties,
        totalGMV: aggregate.totalGMV,
        totalOrders: aggregate.totalOrders,
        channels: Array.from(aggregate.channels.values()).sort((a, b) => b.gmv - a.gmv),
      },
    };
  });

  return { ...boundaries, features };
}

function getMaxGMV(boundaries: FeatureCollection<Geometry, CityBoundaryProperties>) {
  return Math.max(1, ...boundaries.features.map((feature) => feature.properties?.totalGMV ?? 0));
}

function gmvRatio(gmv: number, maxGMV: number) {
  return Math.max(0, Math.min(1, gmv / maxGMV));
}

function getFillColor(gmv: number, maxGMV: number, opacity: number) {
  const ratio = gmvRatio(gmv, maxGMV);
  const alpha = (value: number) => Math.round(value * opacity);

  if (ratio > 0.72) return [249, 115, 22, alpha(90 + ratio * 135)];
  if (ratio > 0.45) return [245, 158, 11, alpha(82 + ratio * 130)];
  if (ratio > 0.2) return [99, 102, 241, alpha(72 + ratio * 120)];
  return [6, 182, 212, alpha(44 + ratio * 110)];
}

function getLineColor(gmv: number, maxGMV: number) {
  const ratio = gmvRatio(gmv, maxGMV);
  return [226, 232, 240, 130 + ratio * 105];
}

function expandBounds(bounds: CityBounds, ratio = 0.16, minSpan = 0.7): CityBounds {
  const width = Math.max(bounds[2] - bounds[0], minSpan);
  const height = Math.max(bounds[3] - bounds[1], minSpan);
  const centerLng = (bounds[0] + bounds[2]) / 2;
  const centerLat = (bounds[1] + bounds[3]) / 2;
  const halfWidth = (width * (1 + ratio)) / 2;
  const halfHeight = (height * (1 + ratio)) / 2;

  return [
    Math.max(-180, centerLng - halfWidth),
    Math.max(-85, centerLat - halfHeight),
    Math.min(180, centerLng + halfWidth),
    Math.min(85, centerLat + halfHeight),
  ];
}

function getActiveBounds(boundaries: FeatureCollection<Geometry, CityBoundaryProperties>): CityBounds | null {
  return boundaries.features.reduce<CityBounds | null>((current, feature) => {
    const bbox = feature.properties?.bbox;
    if (!bbox) return current;

    if (!current) return bbox;
    return [
      Math.min(current[0], bbox[0]),
      Math.min(current[1], bbox[1]),
      Math.max(current[2], bbox[2]),
      Math.max(current[3], bbox[3]),
    ];
  }, null);
}

function fitGMVBounds(map: MapLibreMap, bounds: CityBounds | null, duration = 0, level: BoundaryLevel = "city") {
  const targetBounds = bounds ?? INDONESIA_BOUNDS;
  const visibleBounds = bounds
    ? expandBounds(targetBounds, level === "subdistrict" ? 0.16 : 0.24, level === "subdistrict" ? 0.45 : 1.35)
    : targetBounds;
  const fitBounds: [[number, number], [number, number]] = [
    [visibleBounds[0], visibleBounds[1]],
    [visibleBounds[2], visibleBounds[3]],
  ];
  const maxBounds = expandBounds(
    visibleBounds,
    bounds ? (level === "subdistrict" ? 0.52 : 0.36) : 0.04,
    bounds ? (level === "subdistrict" ? 0.9 : 2.6) : 0,
  );
  const maxBoundsLike: [[number, number], [number, number]] = [
    [maxBounds[0], maxBounds[1]],
    [maxBounds[2], maxBounds[3]],
  ];

  map.stop();
  map.setMaxBounds(undefined);
  map.setMinZoom(0);

  const camera = map.cameraForBounds(fitBounds, {
    padding: DATA_VIEW_PADDING,
    maxZoom: bounds ? (level === "subdistrict" ? 9.25 : 7.25) : 4.75,
  });
  if (!camera?.center || typeof camera.zoom !== "number") {
    return;
  }

  const nextMinZoom =
    typeof camera?.zoom === "number"
      ? Math.max(2.8, Math.min(bounds ? 7.05 : 4.3, camera.zoom - 0.18))
      : 3.2;

  const boundedMinZoom =
    level === "subdistrict" && bounds
      ? Math.max(3.4, Math.min(8.85, camera.zoom - 0.22))
      : nextMinZoom;

  map.easeTo({
    center: camera.center,
    zoom: camera.zoom,
    bearing: 0,
    pitch: DEFAULT_MAP_PITCH,
    duration,
  });

  window.setTimeout(() => {
    map.setMaxBounds(maxBoundsLike);
    map.setMinZoom(boundedMinZoom);
  }, duration + 40);
}

function getTooltipPosition(container: HTMLDivElement | null, x: number, y: number) {
  const width = container?.clientWidth ?? 320;
  const height = container?.clientHeight ?? 320;

  return {
    x: Math.min(x + 16, Math.max(16, width - 292)),
    y: Math.min(y + 16, Math.max(16, height - 250)),
  };
}

function transactionMatchesCityBoundary(
  transaction: GeoTransactionSummary,
  city: CityBoundaryProperties,
  subdistrictLookup?: SubdistrictLookup,
) {
  const locationLike: LocationGMV = {
    source: transaction.source,
    channelKey: transaction.channelKey,
    province: transaction.province ?? "Unknown",
    city: transaction.city ?? "Unknown",
    district: transaction.district,
    orders: 1,
    gmv: transaction.bookedGMV,
    activeGMV: transaction.activeGMV,
    cancellationValue: Math.max(0, transaction.refundAmount ?? 0),
    regionalManager: transaction.regionalManager,
    areaManager: transaction.areaManager,
  };

  return locationMatchesCityBoundary(locationLike, city, subdistrictLookup);
}

function transactionMatchesSubdistrictBoundary(transaction: GeoTransactionSummary, boundary: CityBoundaryProperties) {
  const transactionDistrictKeys = districtKeyVariants(transaction.district);
  const boundaryDistrictKeys = districtKeyVariants(boundary.districtKey ?? boundary.sourceName ?? boundary.name);
  if (!transactionDistrictKeys.length || !boundaryDistrictKeys.length) return false;

  const provinceKey = normalizeProvinceKey(transaction.province ?? "");
  const cityKey = normalizeCityKey(transaction.city ?? "");
  const targetProvinceKey = boundary.provinceKey ?? normalizeProvinceKey(boundary.province ?? "");
  const targetCityKey = boundary.cityKey ?? normalizeCityKey(boundary.citySourceName ?? boundary.cityName ?? "");

  return (
    provinceKey === targetProvinceKey &&
    cityKey === targetCityKey &&
    transactionDistrictKeys.some((districtKey) => boundaryDistrictKeys.includes(districtKey))
  );
}

function formatTransactionDate(value: string | null) {
  if (!value) return "N/A";
  return value.slice(0, 10);
}

function normalizePopupText(value?: string | null, fallback = "Unknown") {
  const next = value?.trim();
  return next && next !== "Agency" ? next : fallback;
}

function buildBoundaryTransactionDetail(
  detail: SelectedBoundaryDetail | null,
  transactions: GeoTransactionSummary[],
  selectedChannels: string[],
  isGtOnly: boolean,
  effectiveRegionalManager: string,
  effectiveAreaManager: string,
  subdistrictLookup?: SubdistrictLookup,
  drilldownCity?: CityBoundaryProperties | null,
): BoundaryTransactionDetail | null {
  if (!detail) return null;

  const matchingTransactions = transactions.filter((transaction) => {
    if (!selectedChannels.includes(transaction.channelKey)) return false;
    if (isGtOnly && transaction.channelKey !== "gt") return false;
    if (isGtOnly && effectiveRegionalManager !== "all" && transaction.regionalManager !== effectiveRegionalManager) return false;
    if (isGtOnly && effectiveAreaManager !== "all" && transaction.areaManager !== effectiveAreaManager) return false;

    if (detail.level === "subdistrict") {
      return (
        Boolean(drilldownCity && transactionMatchesCityBoundary(transaction, drilldownCity, subdistrictLookup)) &&
        transactionMatchesSubdistrictBoundary(transaction, detail.properties)
      );
    }

    return transactionMatchesCityBoundary(transaction, detail.properties, subdistrictLookup);
  });

  const channelMap = new Map<string, PopupChannelDetail>();
  const managerMap = new Map<string, PopupManagerDetail>();
  const salesMap = new Map<string, PopupSalesDetail>();

  matchingTransactions.forEach((transaction) => {
    const channelName = channelLabel(transaction.channelKey);
    const channel = channelMap.get(transaction.channelKey) ?? {
      channel: channelName,
      channelKey: transaction.channelKey,
      gmv: 0,
      orders: 0,
    };
    channel.gmv += transaction.bookedGMV;
    channel.orders += 1;
    channelMap.set(transaction.channelKey, channel);

    if (transaction.channelKey === "gt") {
      const managerName = normalizePopupText(transaction.areaManager, "Unassigned AM");
      const manager = managerMap.get(managerName) ?? {
        manager: managerName,
        gmv: 0,
        orders: 0,
      };
      manager.gmv += transaction.bookedGMV;
      manager.orders += 1;
      managerMap.set(managerName, manager);

      const salesName = normalizePopupText(transaction.salesName, "Unassigned sales");
      const salesKey = `${managerName}|${salesName}`;
      const sales = salesMap.get(salesKey) ?? {
        manager: managerName,
        salesName,
        gmv: 0,
        orders: 0,
      };
      sales.gmv += transaction.bookedGMV;
      sales.orders += 1;
      salesMap.set(salesKey, sales);
    }
  });

  const title = detail.level === "subdistrict"
    ? `${detail.properties.name ?? "Kecamatan"}`
    : `${detail.properties.name ?? "City"}`;
  const subtitle = detail.level === "subdistrict"
    ? `${detail.properties.cityName ?? drilldownCity?.name ?? ""}, ${detail.properties.province ?? ""}`
    : `${detail.properties.province ?? ""}`;

  return {
    title,
    subtitle,
    totalGMV: matchingTransactions.reduce((total, transaction) => total + transaction.bookedGMV, 0),
    totalOrders: matchingTransactions.length,
    channels: Array.from(channelMap.values()).sort((a, b) => b.gmv - a.gmv),
    areaManagers: Array.from(managerMap.values()).sort((a, b) => b.gmv - a.gmv),
    sales: Array.from(salesMap.values()).sort((a, b) => a.manager.localeCompare(b.manager) || b.gmv - a.gmv),
    transactions: matchingTransactions
      .map((transaction) => ({
        orderKey: transaction.orderKey,
        sourceOrderId: transaction.sourceOrderId,
        customer: normalizePopupText(transaction.customer, "Unknown customer"),
        channel: channelLabel(transaction.channelKey),
        channelKey: transaction.channelKey,
        areaManager: transaction.areaManager,
        regionalManager: transaction.regionalManager,
        salesName: transaction.salesName,
        date: transaction.orderCreatedAt,
        status: transaction.status,
        gmv: transaction.bookedGMV,
      }))
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.gmv - a.gmv),
  };
}

function TransactionDetailPopup({
  detail,
  visibleTransactions,
  isGtOnly,
  activeTab,
  customerSearch,
  onTabChange,
  onSearchChange,
  onClose,
}: {
  detail: BoundaryTransactionDetail;
  visibleTransactions: PopupTransactionDetail[];
  isGtOnly: boolean;
  activeTab: "summary" | "customers";
  customerSearch: string;
  onTabChange: (tab: "summary" | "customers") => void;
  onSearchChange: (value: string) => void;
  onClose: () => void;
}) {
  const maxChannelGMV = Math.max(1, ...detail.channels.map((channel) => channel.gmv));
  const maxManagerGMV = Math.max(1, ...detail.areaManagers.map((manager) => manager.gmv));
  const maxSalesGMV = Math.max(1, ...detail.sales.map((sales) => sales.gmv));
  const salesByManager = detail.sales.reduce<Array<{ manager: string; sales: PopupSalesDetail[] }>>(
    (groups, sales) => {
      const current = groups.find((group) => group.manager === sales.manager);
      if (current) {
        current.sales.push(sales);
      } else {
        groups.push({ manager: sales.manager, sales: [sales] });
      }
      return groups;
    },
    [],
  );

  return (
    <div className="absolute bottom-4 right-3 z-50 flex max-h-[min(680px,calc(100%-2rem))] w-[calc(100%-1.5rem)] max-w-[520px] flex-col overflow-hidden rounded-[10px] border border-slate-700/90 bg-slate-950/96 text-slate-100 shadow-2xl shadow-slate-950/60 backdrop-blur sm:right-4 sm:w-[520px]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
            <MapPin className="h-3.5 w-3.5" />
            Transaction Detail
          </div>
          <h4 className="mt-1 truncate text-base font-semibold text-white">{detail.title}</h4>
          <p className="truncate text-[11px] text-slate-400">{detail.subtitle || "Mapped boundary"}</p>
        </div>
        <button
          type="button"
          aria-label="Close transaction detail"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-slate-800 bg-slate-900/80 text-slate-400 transition hover:border-cyan-300/70 hover:text-cyan-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-900/36">
        <div className="px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Total GMV</p>
          <p className="mt-1 text-sm font-semibold text-white">{abbreviateIDR(detail.totalGMV)}</p>
        </div>
        <div className="border-x border-slate-800 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Orders</p>
          <p className="mt-1 text-sm font-semibold text-white">{formatNumber(detail.totalOrders)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Channels</p>
          <p className="mt-1 text-sm font-semibold text-white">{formatNumber(detail.channels.length)}</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-800 px-3 py-2">
        {[
          { key: "summary" as const, label: "Summary", icon: ListFilter },
          { key: "customers" as const, label: "Customers", icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "flex h-8 items-center gap-2 rounded-[8px] px-3 text-xs font-medium transition",
                isActive
                  ? "bg-cyan-500/14 text-cyan-100"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "summary" ? (
        <div className="min-h-0 overflow-y-auto px-4 py-3">
          {!isGtOnly ? (
            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-white">GMV by Channel</p>
                <span className="text-[11px] text-slate-500">{formatNumber(detail.channels.length)} channels</span>
              </div>
              <div className="space-y-2.5">
                {detail.channels.map((channel) => {
                  const width = Math.max(5, (channel.gmv / maxChannelGMV) * 100);

                  return (
                    <div key={channel.channelKey}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-xs font-medium text-slate-200">{channel.channel}</span>
                        <span className="shrink-0 text-xs font-semibold text-white">{formatIDR(channel.gmv)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-orange-400"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className="w-16 text-right text-[11px] text-slate-400">{formatNumber(channel.orders)} orders</span>
                      </div>
                    </div>
                  );
                })}
                {detail.channels.length === 0 ? (
                  <div className="rounded-[8px] border border-slate-800 bg-slate-900/50 px-3 py-5 text-center text-xs text-slate-400">
                    No channel GMV in current map filter.
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className={cn(!isGtOnly && "mt-5 border-t border-slate-800 pt-4")}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-white">GT Area Manager GMV</p>
              <span className="text-[11px] text-slate-500">{formatNumber(detail.areaManagers.length)} AM</span>
            </div>
            <div className="space-y-2.5">
              {detail.areaManagers.map((manager) => {
                const width = Math.max(5, (manager.gmv / maxManagerGMV) * 100);

                return (
                  <div key={manager.manager}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-xs font-medium text-slate-200">{manager.manager}</span>
                      <span className="shrink-0 text-xs font-semibold text-white">{formatIDR(manager.gmv)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="w-16 text-right text-[11px] text-slate-400">{formatNumber(manager.orders)} orders</span>
                    </div>
                  </div>
                );
              })}
              {detail.areaManagers.length === 0 ? (
                <div className="rounded-[8px] border border-slate-800 bg-slate-900/50 px-3 py-5 text-center text-xs text-slate-400">
                  No GT Area Manager transaction in this boundary.
                </div>
              ) : null}
            </div>
          </section>

          {isGtOnly ? (
            <section className="mt-5 border-t border-slate-800 pt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-white">Sales / BD GMV by Area Manager</p>
                <span className="text-[11px] text-slate-500">{formatNumber(detail.sales.length)} sales</span>
              </div>
              <div className="space-y-4">
                {salesByManager.map((group) => (
                  <div key={group.manager} className="rounded-[8px] border border-slate-800 bg-slate-900/36 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="truncate text-xs font-semibold text-cyan-100">{group.manager}</p>
                      <span className="text-[11px] text-slate-500">{formatNumber(group.sales.length)} sales</span>
                    </div>
                    <div className="space-y-2.5">
                      {group.sales.map((sales) => {
                        const width = Math.max(5, (sales.gmv / maxSalesGMV) * 100);

                        return (
                          <div key={`${sales.manager}-${sales.salesName}`}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="truncate text-xs font-medium text-slate-200">{sales.salesName}</span>
                              <span className="shrink-0 text-xs font-semibold text-white">{formatIDR(sales.gmv)}</span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-300"
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                              <span className="w-16 text-right text-[11px] text-slate-400">{formatNumber(sales.orders)} orders</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {detail.sales.length === 0 ? (
                  <div className="rounded-[8px] border border-slate-800 bg-slate-900/50 px-3 py-5 text-center text-xs text-slate-400">
                    No BD sales transaction in this boundary.
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-slate-800 p-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                value={customerSearch}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search customer, order, AM, channel..."
                className="h-9 w-full rounded-[8px] border border-slate-800 bg-slate-900/80 pl-8 pr-3 text-xs text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/70"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {visibleTransactions.map((transaction) => (
              <div
                key={`${transaction.orderKey}-${transaction.sourceOrderId}`}
                className="grid gap-2 border-b border-slate-800/80 px-4 py-3 transition hover:bg-slate-900/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{transaction.customer}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{transaction.sourceOrderId || transaction.orderKey}</p>
                  </div>
                  <span className="shrink-0 text-right text-sm font-semibold text-white">{abbreviateIDR(transaction.gmv)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1">
                    <CalendarDays className="h-3 w-3" />
                    {formatTransactionDate(transaction.date)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1">
                    <ShoppingBag className="h-3 w-3" />
                    {transaction.channel}
                  </span>
                  {transaction.channelKey === "gt" ? (
                    <>
                      <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-slate-900 px-2 py-1">
                        <Users className="h-3 w-3" />
                        <span className="truncate">{normalizePopupText(transaction.areaManager, "Unassigned AM")}</span>
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-slate-900 px-2 py-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{normalizePopupText(transaction.salesName, "Unassigned sales")}</span>
                      </span>
                    </>
                  ) : null}
                  <span className="rounded-md bg-slate-900 px-2 py-1 capitalize">{transaction.status}</span>
                </div>
              </div>
            ))}
            {visibleTransactions.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-slate-400">
                No transactions match the current search.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export function MapLibreGeoHeatmap({ locations, transactions = [], className }: MapLibreGeoHeatmapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayRef = useRef<DeckOverlay | null>(null);
  const geoJsonLayerRef = useRef<GeoJsonLayerConstructor | null>(null);
  const activePropertiesByIdRef = useRef<Map<string, CityBoundaryProperties>>(new Map());
  const drilldownEnabledRef = useRef(false);
  const activeBoundaryLevelRef = useRef<BoundaryLevel>("city");
  const [cityBoundaries, setCityBoundaries] = useState<FeatureCollection<Geometry, CityBoundaryProperties> | null>(null);
  const [subdistrictBoundaries, setSubdistrictBoundaries] =
    useState<FeatureCollection<Geometry, CityBoundaryProperties> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [deckReadyVersion, setDeckReadyVersion] = useState(0);
  const [showGMVBlocks, setShowGMVBlocks] = useState(true);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [gmvOpacity, setGmvOpacity] = useState(0.82);
  const [isClearMap, setIsClearMap] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedChannelKeys, setSelectedChannelKeys] = useState<string[]>([]);
  const [selectedMarketplaceChannelKeys, setSelectedMarketplaceChannelKeys] = useState<string[]>([]);
  const [selectedRegionalManager, setSelectedRegionalManager] = useState("all");
  const [selectedAreaManager, setSelectedAreaManager] = useState("all");
  const [metricMode, setMetricMode] = useState<MetricMode>("gmv");
  const [drilldownCity, setDrilldownCity] = useState<CityBoundaryProperties | null>(null);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<SelectedBoundaryDetail | null>(null);
  const [detailTab, setDetailTab] = useState<"summary" | "customers">("summary");
  const [customerSearch, setCustomerSearch] = useState("");

  const normalizedLocations = useMemo(
    () =>
      locations.map((location) => ({
        ...location,
        channelKey: inferChannelKey(location),
      })),
    [locations],
  );
  const availableChannelOptions = useMemo(() => {
    const availableKeys = new Set(
      normalizedLocations
        .filter((location) => location.gmv > 0 || (location.cancellationValue ?? 0) > 0)
        .map((location) => location.channelKey ?? inferChannelKey(location)),
    );
    const availableGroups = new Set(Array.from(availableKeys).map(channelGroupKey));
    const ordered = TOP_CHANNEL_OPTIONS.filter((channel) => availableGroups.has(channel.key));
    const custom = Array.from(availableKeys)
      .map(channelGroupKey)
      .filter((key) => !TOP_CHANNEL_OPTIONS.some((channel) => channel.key === key))
      .filter((key, index, values) => values.indexOf(key) === index)
      .sort()
      .map((key) => ({ key, label: channelLabel(key) }));

    return [...ordered, ...custom];
  }, [normalizedLocations]);
  const availableChannelKeys = useMemo(
    () => availableChannelOptions.map((channel) => channel.key),
    [availableChannelOptions],
  );
  const selectedChannelGroups = useMemo(() => {
    const validSelected = selectedChannelKeys.filter((key) => availableChannelKeys.includes(key));
    return validSelected.length ? validSelected : availableChannelKeys;
  }, [availableChannelKeys, selectedChannelKeys]);
  const availableMarketplaceOptions = useMemo(() => {
    const availableKeys = new Set(
      normalizedLocations
        .filter((location) => location.gmv > 0 || (location.cancellationValue ?? 0) > 0)
        .map((location) => location.channelKey ?? inferChannelKey(location)),
    );

    return MARKETPLACE_CHANNEL_OPTIONS.filter((channel) => availableKeys.has(channel.key));
  }, [normalizedLocations]);
  const availableMarketplaceKeys = useMemo(
    () => availableMarketplaceOptions.map((channel) => channel.key),
    [availableMarketplaceOptions],
  );
  const isMarketplaceOnly = selectedChannelGroups.length === 1 && selectedChannelGroups[0] === "marketplace";
  const selectedMarketplaceChannels = useMemo(() => {
    const validSelected = selectedMarketplaceChannelKeys.filter((key) => availableMarketplaceKeys.includes(key));
    return validSelected.length ? validSelected : availableMarketplaceKeys;
  }, [availableMarketplaceKeys, selectedMarketplaceChannelKeys]);
  const selectedChannels = useMemo(
    () =>
      selectedChannelGroups.flatMap((channelKey) => {
        if (channelKey !== "marketplace") return [channelKey];
        return isMarketplaceOnly ? selectedMarketplaceChannels : availableMarketplaceKeys;
      }),
    [availableMarketplaceKeys, isMarketplaceOnly, selectedChannelGroups, selectedMarketplaceChannels],
  );
  const isGtOnly = selectedChannels.length === 1 && selectedChannels[0] === "gt";
  const regionalManagerOptions = useMemo(
    () =>
      Array.from(
        new Set(
          normalizedLocations
            .filter((location) => (location.channelKey ?? inferChannelKey(location)) === "gt")
            .map((location) => location.regionalManager)
            .filter((value): value is string => Boolean(value && value !== "Agency")),
        ),
      ).sort(),
    [normalizedLocations],
  );
  const effectiveRegionalManager =
    isGtOnly && regionalManagerOptions.includes(selectedRegionalManager)
      ? selectedRegionalManager
      : "all";
  const areaManagerOptions = useMemo(
    () =>
      Array.from(
        new Set(
          normalizedLocations
            .filter(
              (location) =>
                (location.channelKey ?? inferChannelKey(location)) === "gt" &&
                effectiveRegionalManager !== "all" &&
                location.regionalManager === effectiveRegionalManager,
            )
            .map((location) => location.areaManager)
            .filter((value): value is string => Boolean(value && value !== "Agency")),
        ),
      ).sort(),
    [effectiveRegionalManager, normalizedLocations],
  );
  const effectiveAreaManager =
    isGtOnly && effectiveRegionalManager !== "all" && areaManagerOptions.includes(selectedAreaManager)
      ? selectedAreaManager
      : "all";
  const filteredLocations = useMemo(() => {
    const channelFiltered = normalizedLocations.filter((location) =>
      selectedChannels.includes(location.channelKey ?? inferChannelKey(location)),
    );

    if (!isGtOnly) {
      return channelFiltered;
    }

    return channelFiltered.filter((location) => {
      if ((location.channelKey ?? inferChannelKey(location)) !== "gt") return false;
      if (effectiveRegionalManager !== "all" && location.regionalManager !== effectiveRegionalManager) return false;
      if (effectiveAreaManager !== "all" && location.areaManager !== effectiveAreaManager) return false;
      return true;
    });
  }, [effectiveAreaManager, effectiveRegionalManager, isGtOnly, normalizedLocations, selectedChannels]);
  const isSubdistrictDrilldown = Boolean(drilldownCity && isGtOnly);
  const activeBoundaryLevel: BoundaryLevel = isSubdistrictDrilldown ? "subdistrict" : "city";
  const subdistrictLookup = useMemo(
    () => buildSubdistrictLookup(subdistrictBoundaries),
    [subdistrictBoundaries],
  );
  const cityActiveBoundaries = useMemo(
    () => buildActiveBoundaries(cityBoundaries, filteredLocations, metricMode, subdistrictLookup),
    [cityBoundaries, filteredLocations, metricMode, subdistrictLookup],
  );
  const subdistrictActiveBoundaries = useMemo(
    () =>
      buildActiveSubdistrictBoundaries(
        subdistrictBoundaries,
        filteredLocations,
        drilldownCity,
        metricMode,
        subdistrictLookup,
      ),
    [drilldownCity, filteredLocations, metricMode, subdistrictBoundaries, subdistrictLookup],
  );
  const activeBoundaries = isSubdistrictDrilldown ? subdistrictActiveBoundaries : cityActiveBoundaries;
  const cityActiveBounds = useMemo(() => getActiveBounds(cityActiveBoundaries), [cityActiveBoundaries]);
  const activeBounds = useMemo(() => getActiveBounds(activeBoundaries), [activeBoundaries]);
  const activeBoundsKey = activeBounds?.join("|") ?? "none";
  const maxGMV = useMemo(() => getMaxGMV(activeBoundaries), [activeBoundaries]);
  const mappedGMV = useMemo(
    () => activeBoundaries.features.reduce((total, feature) => total + (feature.properties?.totalGMV ?? 0), 0),
    [activeBoundaries],
  );
  const totalLocationGMV = useMemo(
    () =>
      filteredLocations
        .filter(
          (location) =>
            !isSubdistrictDrilldown || locationMatchesCityBoundary(location, drilldownCity!, subdistrictLookup),
        )
        .reduce((total, location) => total + Math.max(0, getLocationMetric(location, metricMode)), 0),
    [drilldownCity, filteredLocations, isSubdistrictDrilldown, metricMode, subdistrictLookup],
  );
  const boundarySourceCount = activeBoundaryLevel === "subdistrict"
    ? subdistrictBoundaries?.features.length
    : cityBoundaries?.features.length;
  const metricLabel = metricMode === "cancellation" ? "Value Cancellation" : "GMV";
  const boundaryMetricTitle = activeBoundaryLevel === "subdistrict"
    ? `GT Kecamatan ${metricLabel}`
    : `Indonesia ${metricLabel} Boundary`;
  const selectedTransactionDetail = useMemo(
    () =>
      buildBoundaryTransactionDetail(
        selectedDetail,
        transactions,
        selectedChannels,
        isGtOnly,
        effectiveRegionalManager,
        effectiveAreaManager,
        subdistrictLookup,
        drilldownCity,
      ),
    [
      drilldownCity,
      effectiveAreaManager,
      effectiveRegionalManager,
      isGtOnly,
      selectedChannels,
      selectedDetail,
      subdistrictLookup,
      transactions,
    ],
  );
  const visiblePopupTransactions = useMemo(() => {
    const search = customerSearch.trim().toLowerCase();
    const rows = selectedTransactionDetail?.transactions ?? [];

    if (!search) return rows;

    return rows.filter((transaction) =>
      [
        transaction.customer,
        transaction.channel,
        transaction.areaManager,
        transaction.regionalManager,
        transaction.salesName,
        transaction.sourceOrderId,
        transaction.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [customerSearch, selectedTransactionDetail]);

  useEffect(() => {
    drilldownEnabledRef.current = isGtOnly;
    activeBoundaryLevelRef.current = activeBoundaryLevel;
  }, [activeBoundaryLevel, isGtOnly]);

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      if (!mapContainerRef.current) {
        return;
      }

      try {
        const [
          { default: maplibregl },
          { MapboxOverlay },
          { GeoJsonLayer },
          cityBoundaryResponse,
          subdistrictBoundaryResponse,
        ] = await Promise.all([
          import("maplibre-gl"),
          import("@deck.gl/mapbox"),
          import("@deck.gl/layers"),
          fetch(CITY_BOUNDARY_URL),
          fetch(SUBDISTRICT_BOUNDARY_URL),
        ]);

        if (!cityBoundaryResponse.ok) {
          throw new Error("City boundary GeoJSON failed to load");
        }
        if (!subdistrictBoundaryResponse.ok) {
          throw new Error("Subdistrict boundary GeoJSON failed to load");
        }

        const boundaries = (await cityBoundaryResponse.json()) as FeatureCollection<Geometry, CityBoundaryProperties>;
        const districts = (await subdistrictBoundaryResponse.json()) as FeatureCollection<Geometry, CityBoundaryProperties>;
        if (cancelled || !mapContainerRef.current) {
          return;
        }

        setCityBoundaries(boundaries);
        setSubdistrictBoundaries(districts);

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: MAP_STYLE,
          center: [118.2, -2.8],
          zoom: 3.8,
          minZoom: 3.2,
          maxZoom: 13,
          pitch: 18,
          maxPitch: 62,
          attributionControl: false,
        });
        const overlay = new MapboxOverlay({
          interleaved: false,
          layers: [],
        }) as DeckOverlay;

        mapRef.current = map;
        overlayRef.current = overlay;
        geoJsonLayerRef.current = GeoJsonLayer as unknown as GeoJsonLayerConstructor;

        map.addControl(overlay as unknown as Parameters<MapLibreMap["addControl"]>[0]);
        map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

        map.dragPan.enable();
        map.scrollZoom.enable();
        map.boxZoom.enable();
        map.dragRotate.enable();
        map.keyboard.enable();
        map.doubleClickZoom.enable();
        map.touchZoomRotate.enable();
        map.touchZoomRotate.enableRotation();

        map.once("load", () => {
          if (cancelled) return;
          map.addSource(HOVER_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: HOVER_LAYER_ID,
            type: "fill",
            source: HOVER_SOURCE_ID,
            paint: {
              "fill-color": "#ffffff",
              "fill-opacity": 0.001,
            },
          });
          map.on("mousemove", HOVER_LAYER_ID, (event: MapLayerMouseEvent) => {
            const feature = event.features?.[0] as Feature<Geometry, CityBoundaryProperties> | undefined;
            const featureId = feature ? boundaryFeatureId(feature) : undefined;
            const properties = featureId ? activePropertiesByIdRef.current.get(featureId) : undefined;

            if (!properties || (properties.totalGMV ?? 0) <= 0) {
              setHover(null);
              map.getCanvas().style.cursor = "";
              return;
            }

            const point = getTooltipPosition(mapContainerRef.current, event.point.x, event.point.y);
            map.getCanvas().style.cursor = "pointer";
            setHover({
              x: point.x,
              y: point.y,
              properties,
            });
          });
          map.on("mouseleave", HOVER_LAYER_ID, () => {
            setHover(null);
            map.getCanvas().style.cursor = "";
          });
          map.on("click", HOVER_LAYER_ID, (event: MapLayerMouseEvent) => {
            const feature = event.features?.[0] as Feature<Geometry, CityBoundaryProperties> | undefined;
            const featureId = feature ? boundaryFeatureId(feature) : undefined;
            const properties = featureId ? activePropertiesByIdRef.current.get(featureId) : undefined;

            if (!properties || (properties.totalGMV ?? 0) <= 0) {
              return;
            }

            setHover(null);
            setDetailTab("summary");
            setCustomerSearch("");
            setSelectedDetail({
              properties,
              level: activeBoundaryLevelRef.current,
            });
          });
          map.on("contextmenu", HOVER_LAYER_ID, (event: MapLayerMouseEvent) => {
            if (!drilldownEnabledRef.current || activeBoundaryLevelRef.current !== "city") {
              return;
            }

            event.preventDefault();

            const feature = event.features?.[0] as Feature<Geometry, CityBoundaryProperties> | undefined;
            const featureId = feature ? boundaryFeatureId(feature) : undefined;
            const properties = featureId ? activePropertiesByIdRef.current.get(featureId) : undefined;

            if (!properties || (properties.totalGMV ?? 0) <= 0) {
              return;
            }

            setHover(null);
            setSelectedDetail(null);
            setDrilldownCity(properties);
          });
          fitGMVBounds(map, null);
          setIsReady(true);
          setDeckReadyVersion((value) => value + 1);
        });

        map.on("error", (event) => {
          console.warn("MapLibre error", event.error);
        });
      } catch (error) {
        console.error(error);
      }
    }

    initializeMap();

    return () => {
      cancelled = true;
      setHover(null);
      setSelectedDetail(null);
      try {
        if (overlayRef.current && mapRef.current) {
          mapRef.current.removeControl(overlayRef.current as unknown as Parameters<MapLibreMap["removeControl"]>[0]);
        }
      } catch {
        // MapLibre may already have removed the control during teardown.
      }
      overlayRef.current?.finalize?.();
      overlayRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      geoJsonLayerRef.current = null;
      setIsReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    map.setPaintProperty("geo-background", "background-color", isClearMap ? "#e5edf4" : "#020617");
    map.setPaintProperty("osm-basemap", "raster-opacity", isClearMap ? 0 : 1);
    map.setPaintProperty("clear-basemap", "raster-opacity", isClearMap ? 1 : 0);
  }, [isClearMap, isReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) return;

    fitGMVBounds(map, activeBounds, 520, activeBoundaryLevel);
  }, [activeBoundaryLevel, activeBounds, activeBoundsKey, isReady]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const GeoJsonLayer = geoJsonLayerRef.current;
    const map = mapRef.current;
    activePropertiesByIdRef.current = new Map(
      activeBoundaries.features.map((feature) => [boundaryFeatureId(feature), feature.properties ?? {}]),
    );

    if (!overlay || !GeoJsonLayer) {
      return;
    }

    const hoverSource = map?.getSource(HOVER_SOURCE_ID) as GeoJSONSource | undefined;
    hoverSource?.setData(activeBoundaries);

    const layer = new GeoJsonLayer({
      id: "geo-sales-city-gmv-boundaries",
      data: activeBoundaries,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 72],
      stroked: showBoundaries,
      filled: showGMVBlocks,
      lineWidthUnits: "pixels",
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 4,
      getFillColor: (feature: Feature<Geometry, CityBoundaryProperties>) =>
        getFillColor(feature.properties?.totalGMV ?? 0, maxGMV, gmvOpacity),
      getLineColor: (feature: Feature<Geometry, CityBoundaryProperties>) =>
        getLineColor(feature.properties?.totalGMV ?? 0, maxGMV),
      getLineWidth: (feature: Feature<Geometry, CityBoundaryProperties>) =>
        1 + gmvRatio(feature.properties?.totalGMV ?? 0, maxGMV) * 2.6,
      updateTriggers: {
        getFillColor: [maxGMV, gmvOpacity],
        getLineColor: [maxGMV],
        getLineWidth: [maxGMV],
      },
      onHover: (info: { x?: number; y?: number; object?: Feature<Geometry, CityBoundaryProperties> | null }) => {
        if (!info.object?.properties || (info.object.properties.totalGMV ?? 0) <= 0) {
          setHover(null);
          if (map) map.getCanvas().style.cursor = "";
          return;
        }

        if (map) map.getCanvas().style.cursor = "pointer";
        const point = getTooltipPosition(mapContainerRef.current, info.x ?? 0, info.y ?? 0);

        setHover({
          x: point.x,
          y: point.y,
          properties: info.object.properties,
        });
      },
      onClick: (info: { object?: Feature<Geometry, CityBoundaryProperties> | null }) => {
        if (!info.object?.properties || (info.object.properties.totalGMV ?? 0) <= 0) return;

        setHover(null);
        setDetailTab("summary");
        setCustomerSearch("");
        setSelectedDetail({
          properties: info.object.properties,
          level: activeBoundaryLevelRef.current,
        });
      },
    });

    overlay.setProps({ layers: activeBoundaries.features.length ? [layer] : [] });
  }, [activeBoundaries, deckReadyVersion, gmvOpacity, maxGMV, showBoundaries, showGMVBlocks]);

  function resetView() {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    if (drilldownCity) {
      setDrilldownCity(null);
      setHover(null);
      setSelectedDetail(null);
      fitGMVBounds(map, cityActiveBounds, 520, "city");
      return;
    }

    fitGMVBounds(map, activeBounds, 520, activeBoundaryLevel);
  }

  function zoomMap(delta: number) {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    map.easeTo({
      zoom: map.getZoom() + delta,
      duration: 260,
    });
  }

  function togglePitch() {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    map.easeTo({
      pitch: map.getPitch() > 10 ? 0 : 46,
      duration: 360,
    });
  }

  function toggleChannel(channelKey: string) {
    if (channelKey === "gt" && selectedChannelGroups.includes("gt")) {
      setSelectedRegionalManager("all");
      setSelectedAreaManager("all");
    }

    setSelectedChannelKeys((current) => {
      const base = current.length ? current : availableChannelKeys;
      const next = base.includes(channelKey)
        ? base.filter((key) => key !== channelKey)
        : [...base, channelKey];

      return next.length ? next : base;
    });
    setDrilldownCity(null);
    setSelectedDetail(null);
  }

  function toggleMarketplaceChannel(channelKey: string) {
    setSelectedMarketplaceChannelKeys((current) => {
      const base = current.length ? current : availableMarketplaceKeys;
      const next = base.includes(channelKey)
        ? base.filter((key) => key !== channelKey)
        : [...base, channelKey];

      return next.length ? next : base;
    });
    setSelectedDetail(null);
  }

  function changeGmvOpacity(delta: number) {
    setGmvOpacity((value) => Math.max(0.2, Math.min(1, Number((value + delta).toFixed(2)))));
  }

  function toggleClearMap() {
    const next = !isClearMap;
    setIsClearMap(next);
    setGmvOpacity(next ? 0.46 : 0.82);
  }

  return (
    <div
      className={cn(
        "relative h-[520px] min-h-[520px] overflow-hidden rounded-[8px] border border-slate-800 bg-slate-950 sm:h-[580px] sm:min-h-[580px] lg:h-[640px] lg:min-h-[640px]",
        className,
      )}
    >
      <div
        ref={mapContainerRef}
        className="absolute inset-0 z-0"
        style={{ width: "100%", height: "100%" }}
      />

      {hover ? (
        <div
          className="pointer-events-none absolute z-50 w-[min(270px,calc(100vw-2rem))] rounded-[8px] border border-slate-700/90 bg-slate-950/94 p-3 text-xs text-slate-100 shadow-2xl shadow-slate-950/50 backdrop-blur"
          style={{
            left: hover.x,
            top: hover.y,
          }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
            {activeBoundaryLevel === "subdistrict" ? `Kecamatan ${metricLabel}` : `City Boundary ${metricLabel}`}
          </div>
          <div className="mt-1 text-sm font-semibold text-white">{hover.properties.name}</div>
          <div className="text-[11px] text-slate-400">
            {activeBoundaryLevel === "subdistrict"
              ? `${hover.properties.cityName ?? drilldownCity?.name ?? ""}, ${hover.properties.province ?? ""}`
              : hover.properties.province}
          </div>
          <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-800 pt-3">
            <span className="text-slate-400">Total {metricLabel}</span>
            <strong className="text-base text-white">{formatIDR(hover.properties.totalGMV ?? 0)}</strong>
          </div>
          <div className="mt-3 space-y-2">
            {(hover.properties.channels ?? []).map((channel) => {
              const width = Math.max(8, (channel.gmv / Math.max(1, hover.properties.totalGMV ?? 1)) * 100);
              return (
                <div key={channel.channel}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-slate-300">{channel.channel}</span>
                    <span className="font-medium text-slate-100">{abbreviateIDR(channel.gmv)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-orange-400"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {selectedTransactionDetail ? (
        <TransactionDetailPopup
          detail={selectedTransactionDetail}
          visibleTransactions={visiblePopupTransactions}
          isGtOnly={isGtOnly}
          activeTab={detailTab}
          customerSearch={customerSearch}
          onTabChange={setDetailTab}
          onSearchChange={setCustomerSearch}
          onClose={() => {
            setSelectedDetail(null);
            setCustomerSearch("");
            setDetailTab("summary");
          }}
        />
      ) : null}

      <div className="pointer-events-none absolute left-3 right-3 top-3 z-40 max-w-none rounded-[8px] border border-slate-800/90 bg-slate-950/82 px-3 py-2 text-slate-100 shadow-lg shadow-slate-950/30 backdrop-blur sm:left-4 sm:right-auto sm:top-4 sm:max-w-[290px]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
          {boundaryMetricTitle}
        </p>
        <p className="mt-1 text-base font-semibold">{abbreviateIDR(mappedGMV)}</p>
        <p className="mt-1 text-[11px] leading-4 text-slate-400">
          {activeBoundaries.features.length.toLocaleString("id-ID")} visible{" "}
          {activeBoundaryLevel === "subdistrict" ? "kecamatan" : "city"} boundaries from{" "}
          {(boundarySourceCount ?? (activeBoundaryLevel === "subdistrict" ? 7264 : 517)).toLocaleString("id-ID")} KML{" "}
          {activeBoundaryLevel === "subdistrict" ? "kecamatan" : "city"} boundaries
        </p>
        <p className="mt-1 text-[11px] leading-4 text-slate-500">
          {totalLocationGMV > 0 ? `${Math.round((mappedGMV / totalLocationGMV) * 1000) / 10}% of uploaded ${metricLabel} mapped` : `Waiting for uploaded ${metricLabel}`}
        </p>
        {activeBoundaryLevel === "subdistrict" && drilldownCity ? (
          <p className="mt-1 text-[11px] leading-4 text-cyan-100/80">
            {drilldownCity.name} GT kecamatan view
          </p>
        ) : null}
      </div>

      <div className="absolute left-3 right-3 top-[112px] z-40 flex max-w-none flex-col items-stretch gap-2 sm:left-auto sm:right-4 sm:top-4 sm:max-w-[calc(100%-2rem)] sm:items-end">
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            aria-label="Zoom in"
            title="Zoom in"
            onClick={() => zoomMap(0.75)}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-slate-700/80 bg-slate-950/82 text-slate-200 shadow-lg shadow-slate-950/30 backdrop-blur transition hover:border-cyan-300/70 hover:text-cyan-100"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            title="Zoom out"
            onClick={() => zoomMap(-0.75)}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-slate-700/80 bg-slate-950/82 text-slate-200 shadow-lg shadow-slate-950/30 backdrop-blur transition hover:border-cyan-300/70 hover:text-cyan-100"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Toggle pitch"
            title="Toggle pitch"
            onClick={togglePitch}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-slate-700/80 bg-slate-950/82 text-slate-200 shadow-lg shadow-slate-950/30 backdrop-blur transition hover:border-cyan-300/70 hover:text-cyan-100"
          >
            <Orbit className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Reset Indonesia view"
            title="Reset Indonesia view"
            onClick={resetView}
            className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-slate-700/80 bg-slate-950/82 text-slate-200 shadow-lg shadow-slate-950/30 backdrop-blur transition hover:border-cyan-300/70 hover:text-cyan-100"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Toggle heatmap polygon blocks"
            title="Toggle heatmap polygon blocks"
            onClick={() => setShowGMVBlocks((value) => !value)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-[8px] border shadow-lg shadow-slate-950/30 backdrop-blur transition",
              showGMVBlocks
                ? "border-cyan-400/70 bg-cyan-500/12 text-cyan-100"
                : "border-slate-700/80 bg-slate-950/82 text-slate-400 hover:text-slate-100",
            )}
          >
            <Flame className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Toggle boundary lines"
            title="Toggle boundary lines"
            onClick={() => setShowBoundaries((value) => !value)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-[8px] border shadow-lg shadow-slate-950/30 backdrop-blur transition",
              showBoundaries
                ? "border-amber-300/70 bg-amber-400/12 text-amber-100"
                : "border-slate-700/80 bg-slate-950/82 text-slate-400 hover:text-slate-100",
            )}
          >
            <Layers className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-expanded={isFilterOpen}
            aria-label={isFilterOpen ? "Hide map filters" : "Show map filters"}
            title={isFilterOpen ? "Hide map filters" : "Show map filters"}
            onClick={() => setIsFilterOpen((value) => !value)}
            className={cn(
              "flex h-9 items-center justify-center gap-2 rounded-[8px] border px-3 text-[11px] font-medium shadow-lg shadow-slate-950/30 backdrop-blur transition",
              isFilterOpen
                ? "border-cyan-300/70 bg-cyan-500/12 text-cyan-100"
                : "border-slate-700/80 bg-slate-950/82 text-slate-300 hover:border-cyan-300/70 hover:text-cyan-100",
            )}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            <span className="tabular-nums text-slate-400">{activeBoundaries.features.length.toLocaleString("id-ID")}</span>
          </button>
        </div>

        {isFilterOpen ? (
          <div className="max-h-[calc(100dvh-10rem)] w-full max-w-full overflow-y-auto rounded-[8px] border border-slate-800/90 bg-slate-950/84 text-xs text-slate-200 shadow-lg shadow-slate-950/30 backdrop-blur sm:w-[360px] sm:max-h-[min(520px,calc(100dvh-6rem))]">
            <div className="flex h-10 items-center justify-between gap-3 px-3">
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
                <Filter className="h-3.5 w-3.5" />
                Filters
              </span>
              <button
                type="button"
                aria-label="Hide map filters"
                onClick={() => setIsFilterOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-400 transition hover:bg-slate-900 hover:text-slate-100"
              >
                <ChevronDown className="h-3.5 w-3.5 rotate-180" />
              </button>
            </div>

            <div className="border-t border-slate-800/90 p-3">
              {drilldownCity ? (
                <button
                  type="button"
                  onClick={() => {
                    setDrilldownCity(null);
                    setHover(null);
                  }}
                  className="mb-3 flex h-8 w-full items-center gap-2 rounded-[8px] border border-slate-700/70 bg-slate-900/80 px-2.5 text-left text-[11px] font-medium text-slate-200 transition hover:border-cyan-300/70 hover:text-cyan-100"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  City boundaries
                </button>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {availableChannelOptions.map((channel) => {
                  const isSelected = selectedChannelGroups.includes(channel.key);

                  return (
                    <button
                      key={channel.key}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleChannel(channel.key)}
                      className={cn(
                        "rounded-[8px] border px-2.5 py-1.5 text-[11px] font-medium transition",
                        isSelected
                          ? "border-cyan-300/70 bg-cyan-500/12 text-cyan-100"
                          : "border-slate-700/70 bg-slate-900/80 text-slate-400 hover:text-slate-100",
                      )}
                    >
                      {channel.label}
                    </button>
                  );
                })}
              </div>

              {isMarketplaceOnly && availableMarketplaceOptions.length ? (
                <div className="mt-3">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Marketplace Channel
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableMarketplaceOptions.map((channel) => {
                      const isSelected = selectedMarketplaceChannels.includes(channel.key);

                      return (
                        <button
                          key={channel.key}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleMarketplaceChannel(channel.key)}
                          className={cn(
                            "rounded-[8px] border px-2.5 py-1.5 text-[11px] font-medium transition",
                            isSelected
                              ? "border-orange-300/70 bg-orange-400/12 text-orange-100"
                              : "border-slate-700/70 bg-slate-900/80 text-slate-400 hover:text-slate-100",
                          )}
                        >
                          {channel.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="mt-3">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Heatmap Metric
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {METRIC_OPTIONS.map((option) => {
                    const isSelected = metricMode === option.key;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setMetricMode(option.key);
                          setDrilldownCity(null);
                          setHover(null);
                          setSelectedDetail(null);
                          setCustomerSearch("");
                          setDetailTab("summary");
                        }}
                        className={cn(
                          "h-8 rounded-[8px] border px-2 text-[11px] font-medium transition",
                          isSelected
                            ? "border-cyan-300/70 bg-cyan-500/12 text-cyan-100"
                            : "border-slate-700/70 bg-slate-900/80 text-slate-400 hover:text-slate-100",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isGtOnly && regionalManagerOptions.length ? (
                <label className="mt-3 block">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Regional Manager
                  </span>
                  <select
                    value={effectiveRegionalManager}
                    onChange={(event) => {
                      setSelectedRegionalManager(event.target.value);
                      setSelectedAreaManager("all");
                      setDrilldownCity(null);
                      setHover(null);
                      setSelectedDetail(null);
                    }}
                    className="h-8 w-full rounded-[8px] border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 outline-none transition focus:border-cyan-300/70"
                  >
                    <option value="all">All GT Regional Managers</option>
                    {regionalManagerOptions.map((manager) => (
                      <option key={manager} value={manager}>
                        {manager}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {isGtOnly && effectiveRegionalManager !== "all" && areaManagerOptions.length ? (
                <label className="mt-3 block">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Area Manager
                  </span>
                  <select
                    value={effectiveAreaManager}
                    onChange={(event) => {
                      setSelectedAreaManager(event.target.value);
                      setDrilldownCity(null);
                      setHover(null);
                      setSelectedDetail(null);
                    }}
                    className="h-8 w-full rounded-[8px] border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 outline-none transition focus:border-cyan-300/70"
                  >
                    <option value="all">All Area Managers</option>
                    {areaManagerOptions.map((manager) => (
                      <option key={manager} value={manager}>
                        {manager}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  aria-pressed={isClearMap}
                  aria-label="Toggle clear map"
                  title="Toggle clear map"
                  onClick={toggleClearMap}
                  className={cn(
                    "flex h-8 items-center justify-between gap-3 rounded-[8px] border px-2.5 text-left text-[11px] font-medium transition",
                    isClearMap
                      ? "border-cyan-300/70 bg-cyan-500/12 text-cyan-100"
                      : "border-slate-700/70 bg-slate-900/80 text-slate-300 hover:text-slate-100",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Sun className="h-3.5 w-3.5" />
                    Clear map
                  </span>
                  <span
                    className={cn(
                      "relative h-4 w-7 rounded-full transition",
                      isClearMap ? "bg-cyan-400/80" : "bg-slate-700",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-3 w-3 rounded-full bg-white transition",
                        isClearMap ? "left-3.5" : "left-0.5",
                      )}
                    />
                  </span>
                </button>

                <div className="grid grid-cols-[76px_28px_1fr_28px_42px] items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-400">Heat opacity</span>
                  <button
                    type="button"
                    aria-label="Decrease heat opacity"
                    title="Decrease heat opacity"
                    onClick={() => changeGmvOpacity(-0.08)}
                    className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-cyan-300/70 hover:text-cyan-100"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={Math.round(gmvOpacity * 100)}
                    onChange={(event) => setGmvOpacity(Number(event.target.value) / 100)}
                    className="h-1.5 accent-orange-300"
                  />
                  <button
                    type="button"
                    aria-label="Increase heat opacity"
                    title="Increase heat opacity"
                    onClick={() => changeGmvOpacity(0.08)}
                    className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-orange-300/70 hover:text-orange-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-right text-[11px] tabular-nums text-slate-300">
                    {Math.round(gmvOpacity * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-40 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2 rounded-[8px] border border-slate-800/90 bg-slate-950/82 px-3 py-2 text-xs text-slate-200 shadow-lg shadow-slate-950/30 backdrop-blur">
        <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
        <span>Low {metricLabel}</span>
        <span className="h-2.5 w-20 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-orange-500" />
        <span>High {metricLabel}</span>
      </div>

    </div>
  );
}
