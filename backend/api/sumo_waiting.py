"""
Parse SUMO tripinfo.xml and expose per-vehicle waiting times.

tripinfo.xml is produced by running SUMO with `--tripinfo-output <path>`.
Each <tripinfo> element carries a `waitingTime` attribute — the total
time the vehicle spent with speed below 0.1 m/s.
"""

import os
import xml.etree.ElementTree as ET
from statistics import mean, median, pstdev

ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
TRIPINFO_PATHS = [
    os.path.join(ROOT, "sumo", "tripinfo.xml"),
    os.path.join(ROOT, "tripinfo.xml"),
    os.path.join(ROOT, "plots", "tripinfo.xml"),
]


def _find_tripinfo():
    for p in TRIPINFO_PATHS:
        if os.path.exists(p):
            return p
    return None


def get_waiting_time():
    path = _find_tripinfo()
    if path is None:
        return {
            "available": False,
            "hint": "Run `python sumo_eval.py` (it now writes sumo/tripinfo.xml) to populate this panel.",
        }

    try:
        tree = ET.parse(path)
    except ET.ParseError as e:
        return {"available": False, "error": f"tripinfo.xml parse error: {e}"}

    vehicles = []
    for node in tree.getroot().findall("tripinfo"):
        try:
            vehicles.append({
                "id":          node.attrib.get("id", "?"),
                "depart":      float(node.attrib.get("depart", 0)),
                "arrival":     float(node.attrib.get("arrival", 0)),
                "duration":    float(node.attrib.get("duration", 0)),
                "waiting":     float(node.attrib.get("waitingTime", 0)),
                "stops":       int(float(node.attrib.get("waitingCount", 0))),
                "time_loss":   float(node.attrib.get("timeLoss", 0)),
                "route_len":   float(node.attrib.get("routeLength", 0)),
            })
        except (ValueError, TypeError):
            continue

    if not vehicles:
        return {"available": False, "hint": "tripinfo.xml contained no <tripinfo> entries."}

    waits = [v["waiting"] for v in vehicles]
    # Sort so dashboard shows highest-waiters first
    vehicles.sort(key=lambda v: v["waiting"], reverse=True)

    # Histogram bins (0-5s, 5-15s, 15-30s, 30-60s, 60-120s, 120s+)
    edges = [0, 5, 15, 30, 60, 120, float("inf")]
    labels = ["0–5s", "5–15s", "15–30s", "30–60s", "60–120s", "120s+"]
    counts = [0] * (len(edges) - 1)
    for w in waits:
        for i in range(len(edges) - 1):
            if edges[i] <= w < edges[i + 1]:
                counts[i] += 1
                break

    return {
        "available": True,
        "source":    os.path.relpath(path, ROOT),
        "count":     len(vehicles),
        "stats": {
            "mean":   round(mean(waits), 2),
            "median": round(median(waits), 2),
            "max":    round(max(waits), 2),
            "min":    round(min(waits), 2),
            "std":    round(pstdev(waits), 2) if len(waits) > 1 else 0.0,
            "total":  round(sum(waits), 2),
        },
        "histogram": {"labels": labels, "counts": counts},
        "vehicles":  vehicles,
    }
