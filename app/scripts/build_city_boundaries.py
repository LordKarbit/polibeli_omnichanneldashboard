from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from xml.etree.ElementTree import iterparse


KML_NS = "{http://www.opengis.net/kml/2.2}"
PROJECT_ROOT = Path(__file__).resolve().parents[2]
APP_ROOT = PROJECT_ROOT / "app"
LOCAL_PY_DEPS = APP_ROOT / ".pydeps-shapely"
SOURCE_KML = PROJECT_ROOT / "VILLAGE-SUB-DISTRICT BOUNDARIES.kml"
OUTPUT_CITY_GEOJSON = APP_ROOT / "public" / "data" / "geo-sales-city-boundaries.geojson"
OUTPUT_SUBDISTRICT_GEOJSON = APP_ROOT / "public" / "data" / "geo-sales-subdistrict-boundaries.geojson"
CITY_SIMPLIFY_TOLERANCE = 0.002
SUBDISTRICT_SIMPLIFY_TOLERANCE = 0.0012
COORD_DECIMALS = 5

if LOCAL_PY_DEPS.exists():
    sys.path.insert(0, str(LOCAL_PY_DEPS))

try:
    from shapely import make_valid
    from shapely.geometry import Polygon, mapping
    from shapely.ops import unary_union
except ModuleNotFoundError as error:
    raise SystemExit(
        "Missing shapely. Install temporarily with: "
        "python -m pip install shapely --target app/.pydeps-shapely"
    ) from error


def parse_coordinates(text: str | None) -> list[tuple[float, float]]:
    if not text:
        return []

    coordinates: list[tuple[float, float]] = []
    for raw_coord in text.split():
        parts = raw_coord.split(",")
        if len(parts) < 2:
            continue
        try:
            coordinates.append((float(parts[0]), float(parts[1])))
        except ValueError:
            continue

    if len(coordinates) >= 3 and coordinates[0] != coordinates[-1]:
        coordinates.append(coordinates[0])

    return coordinates


def polygons_from_placemark(placemark) -> list[Polygon]:
    polygons: list[Polygon] = []
    for polygon in placemark.iter(f"{KML_NS}Polygon"):
        outer = polygon.find(f"{KML_NS}outerBoundaryIs/{KML_NS}LinearRing/{KML_NS}coordinates")
        shell = parse_coordinates(outer.text if outer is not None else None)
        if len(shell) < 4:
            continue

        holes = []
        for inner in polygon.findall(f"{KML_NS}innerBoundaryIs/{KML_NS}LinearRing/{KML_NS}coordinates"):
            hole = parse_coordinates(inner.text)
            if len(hole) >= 4:
                holes.append(hole)

        geom = Polygon(shell, holes)
        if not geom.is_valid:
            geom = make_valid(geom)

        if geom.is_empty:
            continue

        if geom.geom_type == "Polygon":
            polygons.append(geom)
        elif geom.geom_type == "MultiPolygon":
            polygons.extend(geom.geoms)

    return polygons


def placemark_admin(placemark) -> tuple[str, str, str]:
    city = ""
    district = ""
    province = ""

    for simple_data in placemark.iter(f"{KML_NS}SimpleData"):
        field = simple_data.attrib.get("name")
        value = (simple_data.text or "").strip()

        if field == "WADMKK":
            city = value
        elif field == "WADMKC":
            district = value
        elif field == "WADMPR":
            province = value

    return province, city, district


def title_case(value: str) -> str:
    special = {
        "dki": "DKI",
        "di": "DI",
        "d.i.": "DI",
        "d.i": "DI",
    }

    parts = re.split(r"(\s+|-)", value.lower())
    return "".join(special.get(part, part.capitalize()) for part in parts)


def normalize_key(value: str) -> str:
    text = re.sub(r"[+&().,]", " ", value.lower())
    text = re.sub(r"\b(regency|city|kabupaten|kab|kota administrasi|kota|administrasi)\b", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_admin_key(value: str) -> str:
    text = re.sub(r"[+&().,]", " ", value.lower())
    text = re.sub(r"\bcity\b", "kota", text)
    text = re.sub(r"\bregency\b", "kabupaten", text)
    text = re.sub(r"\bkab\b", "kabupaten", text)
    text = re.sub(r"\bkota administrasi\b", "kota", text)
    return re.sub(r"\s+", " ", text).strip()


def display_city_name(source_city: str) -> str:
    if source_city.lower().startswith("kota"):
        return title_case(source_city)
    return f"Kabupaten {title_case(source_city)}"


def display_subdistrict_name(source_district: str) -> str:
    return title_case(source_district)


def round_geometry(value):
    if isinstance(value, float):
        return round(value, COORD_DECIMALS)
    if isinstance(value, list) or isinstance(value, tuple):
        return [round_geometry(item) for item in value]
    return value


def compact_geometry(geometry):
    data = mapping(geometry)
    data["coordinates"] = round_geometry(data["coordinates"])
    return data


def city_feature(province: str, city: str, geometries: list[Polygon]) -> dict | None:
    dissolved = make_valid(unary_union(geometries))
    simplified = make_valid(dissolved.simplify(CITY_SIMPLIFY_TOLERANCE, preserve_topology=True))
    if simplified.is_empty:
        return None

    center = simplified.representative_point()
    min_x, min_y, max_x, max_y = simplified.bounds
    province_standard = title_case(province)
    city_display = display_city_name(city)
    city_key = normalize_key(city)
    admin_key = normalize_admin_key(city_display)

    return {
        "type": "Feature",
        "properties": {
            "id": f"{normalize_key(province)}|{city_key}|{admin_key}",
            "level": "city",
            "name": city_display,
            "sourceName": city,
            "province": province_standard,
            "provinceKey": normalize_key(province),
            "cityKey": city_key,
            "adminKey": admin_key,
            "sourceKey": normalize_admin_key(city),
            "center": [round(center.x, 6), round(center.y, 6)],
            "bbox": [round(min_x, 6), round(min_y, 6), round(max_x, 6), round(max_y, 6)],
            "sourcePlacemarkCount": len(geometries),
        },
        "geometry": compact_geometry(simplified),
    }


def subdistrict_feature(province: str, city: str, district: str, geometries: list[Polygon]) -> dict | None:
    dissolved = make_valid(unary_union(geometries))
    simplified = make_valid(dissolved.simplify(SUBDISTRICT_SIMPLIFY_TOLERANCE, preserve_topology=True))
    if simplified.is_empty:
        return None

    center = simplified.representative_point()
    min_x, min_y, max_x, max_y = simplified.bounds
    province_standard = title_case(province)
    city_display = display_city_name(city)
    city_key = normalize_key(city)
    admin_key = normalize_admin_key(city_display)
    district_key = normalize_key(district)

    return {
        "type": "Feature",
        "properties": {
            "id": f"{normalize_key(province)}|{city_key}|{admin_key}|{district_key}",
            "level": "subdistrict",
            "name": display_subdistrict_name(district),
            "sourceName": district,
            "province": province_standard,
            "provinceKey": normalize_key(province),
            "cityName": city_display,
            "citySourceName": city,
            "cityKey": city_key,
            "adminKey": admin_key,
            "sourceKey": normalize_admin_key(city),
            "districtKey": district_key,
            "center": [round(center.x, 6), round(center.y, 6)],
            "bbox": [round(min_x, 6), round(min_y, 6), round(max_x, 6), round(max_y, 6)],
            "sourcePlacemarkCount": len(geometries),
        },
        "geometry": compact_geometry(simplified),
    }


def write_feature_collection(
    output_path: Path,
    name: str,
    dissolved_by: str,
    simplify_tolerance: float,
    features: list[dict],
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "name": name,
                "source": SOURCE_KML.name,
                "dissolvedBy": dissolved_by,
                "simplifyTolerance": simplify_tolerance,
                "features": features,
            },
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )


def build_boundaries() -> None:
    if not SOURCE_KML.exists():
        raise FileNotFoundError(f"Missing source KML: {SOURCE_KML}")

    city_groups: dict[tuple[str, str], list[Polygon]] = {}
    subdistrict_groups: dict[tuple[str, str, str], list[Polygon]] = {}
    placemark_count = 0
    polygon_count = 0

    for _, placemark in iterparse(SOURCE_KML, events=("end",)):
        if placemark.tag != f"{KML_NS}Placemark":
            continue

        province, city, district = placemark_admin(placemark)
        if province and city:
            polygons = polygons_from_placemark(placemark)
            if polygons:
                city_groups.setdefault((province, city), []).extend(polygons)
                if district:
                    subdistrict_groups.setdefault((province, city, normalize_key(district)), []).extend(polygons)
                polygon_count += len(polygons)
            placemark_count += 1

        placemark.clear()

    features = []
    for (province, city), geometries in sorted(city_groups.items(), key=lambda item: (item[0][0], item[0][1])):
        feature = city_feature(province, city, geometries)
        if feature:
            features.append(feature)

    subdistrict_features = []
    for (province, city, district), geometries in sorted(
        subdistrict_groups.items(),
        key=lambda item: (item[0][0], item[0][1], item[0][2]),
    ):
        feature = subdistrict_feature(province, city, district, geometries)
        if feature:
            subdistrict_features.append(feature)

    write_feature_collection(
        OUTPUT_CITY_GEOJSON,
        "geo_sales_city_boundaries",
        "WADMKK",
        CITY_SIMPLIFY_TOLERANCE,
        features,
    )
    write_feature_collection(
        OUTPUT_SUBDISTRICT_GEOJSON,
        "geo_sales_subdistrict_boundaries",
        "WADMKK+WADMKC",
        SUBDISTRICT_SIMPLIFY_TOLERANCE,
        subdistrict_features,
    )

    print(f"Read {placemark_count} WADMKK placemarks and {polygon_count} polygons")
    print(f"Wrote {len(features)} city/regency boundaries to {OUTPUT_CITY_GEOJSON}")
    print(f"Wrote {len(subdistrict_features)} subdistrict boundaries to {OUTPUT_SUBDISTRICT_GEOJSON}")


if __name__ == "__main__":
    build_boundaries()
