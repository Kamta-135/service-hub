"""
Plain-Python Haversine distance — no PostGIS/geo extension needed since
we're on SQLite/Turso. Fine at today's scale (filter candidates with a
cheap bounding check first, then compute exact distance only for those);
if the provider count ever grows into the thousands, this is the first
thing to move to a real geo index (e.g. after migrating to Postgres +
PostGIS, or Turso's own future geo support).
"""
import math

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))
