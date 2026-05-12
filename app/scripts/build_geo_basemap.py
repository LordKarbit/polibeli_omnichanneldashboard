from __future__ import annotations

import json
import math
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image, ImageEnhance


APP_ROOT = Path(__file__).resolve().parents[1]
BOUNDARY_GEOJSON = APP_ROOT / "public" / "data" / "geo-sales-city-boundaries.geojson"
OUTPUT_IMAGE = APP_ROOT / "public" / "data" / "geo-sales-basemap.png"

SVG_WIDTH = 1000
SVG_HEIGHT = 520
SVG_PADDING_X = 76
SVG_PADDING_Y = 46
TILE_SIZE = 256
ZOOM = 8


def lon_to_world_x(lon: float, zoom: int) -> float:
    return (lon + 180.0) / 360.0 * TILE_SIZE * (2**zoom)


def lat_to_world_y(lat: float, zoom: int) -> float:
    lat_rad = math.radians(max(min(lat, 85.05112878), -85.05112878))
    mercator = math.log(math.tan(math.pi / 4.0 + lat_rad / 2.0))
    return (1.0 - mercator / math.pi) / 2.0 * TILE_SIZE * (2**zoom)


def expand_bounds_for_svg_padding(bounds: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
    min_lng, min_lat, max_lng, max_lat = bounds
    lng_span = max_lng - min_lng
    lat_span = max_lat - min_lat
    x_expand = lng_span * SVG_PADDING_X / (SVG_WIDTH - SVG_PADDING_X * 2)
    y_expand = lat_span * SVG_PADDING_Y / (SVG_HEIGHT - SVG_PADDING_Y * 2)
    return (min_lng - x_expand, min_lat - y_expand, max_lng + x_expand, max_lat + y_expand)


def boundary_bounds() -> tuple[float, float, float, float]:
    data = json.loads(BOUNDARY_GEOJSON.read_text(encoding="utf-8"))
    bounds = [180.0, 90.0, -180.0, -90.0]
    for feature in data["features"]:
      min_lng, min_lat, max_lng, max_lat = feature["properties"]["bbox"]
      bounds[0] = min(bounds[0], min_lng)
      bounds[1] = min(bounds[1], min_lat)
      bounds[2] = max(bounds[2], max_lng)
      bounds[3] = max(bounds[3], max_lat)
    return tuple(bounds)  # type: ignore[return-value]


def fetch_tile(x: int, y: int, zoom: int) -> Image.Image:
    url = f"https://tile.openstreetmap.org/{zoom}/{x}/{y}.png"
    request = Request(
        url,
        headers={
            "User-Agent": "PolibeliOmnichannelDashboard/1.0 local basemap preview",
        },
    )
    with urlopen(request, timeout=20) as response:
        return Image.open(response).convert("RGB")


def build_basemap() -> None:
    min_lng, min_lat, max_lng, max_lat = expand_bounds_for_svg_padding(boundary_bounds())
    min_x = lon_to_world_x(min_lng, ZOOM)
    max_x = lon_to_world_x(max_lng, ZOOM)
    min_y = lat_to_world_y(max_lat, ZOOM)
    max_y = lat_to_world_y(min_lat, ZOOM)

    tile_min_x = math.floor(min_x / TILE_SIZE)
    tile_max_x = math.floor(max_x / TILE_SIZE)
    tile_min_y = math.floor(min_y / TILE_SIZE)
    tile_max_y = math.floor(max_y / TILE_SIZE)

    mosaic = Image.new(
        "RGB",
        ((tile_max_x - tile_min_x + 1) * TILE_SIZE, (tile_max_y - tile_min_y + 1) * TILE_SIZE),
        (15, 23, 42),
    )

    for tile_x in range(tile_min_x, tile_max_x + 1):
        for tile_y in range(tile_min_y, tile_max_y + 1):
            tile = fetch_tile(tile_x, tile_y, ZOOM)
            mosaic.paste(tile, ((tile_x - tile_min_x) * TILE_SIZE, (tile_y - tile_min_y) * TILE_SIZE))

    crop = mosaic.crop(
        (
            round(min_x - tile_min_x * TILE_SIZE),
            round(min_y - tile_min_y * TILE_SIZE),
            round(max_x - tile_min_x * TILE_SIZE),
            round(max_y - tile_min_y * TILE_SIZE),
        )
    ).resize((SVG_WIDTH, SVG_HEIGHT), Image.Resampling.LANCZOS)

    # Keep geography legible in the dark dashboard without fighting the heatmap.
    crop = ImageEnhance.Color(crop).enhance(0.55)
    crop = ImageEnhance.Contrast(crop).enhance(0.86)
    crop = ImageEnhance.Brightness(crop).enhance(0.58)

    OUTPUT_IMAGE.parent.mkdir(parents=True, exist_ok=True)
    crop.save(OUTPUT_IMAGE, optimize=True)
    print(f"Wrote {OUTPUT_IMAGE}")


if __name__ == "__main__":
    build_basemap()
