#!/usr/bin/env python3
"""Convert a Plotly tracking_animation.html export into the compact JSON the
project-page viewer reads.

Usage:
    python3 plotly_to_tacdeform.py tracking_animation.html bottle "Bottle" out_dir/

Output: out_dir/<id>.json with
    {"id","name","units":"mm","frames":T,
     "object":[x,y,z,...],            # static point cloud, mm, rounded to 0.1
     "tracks":[[x,y,z,...],...],      # one flat array per frame, mm
     "contact":[x,y,z]}               # mean tactile anchor at first frame
"""
import base64, json, sys
import numpy as np

MAX_OBJECT_POINTS = 6000
MAX_TRACKS = 700


def _array(v):
    if isinstance(v, dict) and "bdata" in v:
        dtype = {"f8": "<f8", "f4": "<f4", "i4": "<i4", "i2": "<i2",
                 "u1": "u1", "u2": "<u2"}[v.get("dtype", "f8")]
        return np.frombuffer(base64.b64decode(v["bdata"]), dtype=dtype).astype(np.float64)
    return np.asarray(v, dtype=np.float64)


def _xyz(trace):
    return np.stack([_array(trace["x"]), _array(trace["y"]), _array(trace["z"])], axis=1)


def load_figure(path):
    text = open(path, errors="replace").read()
    decoder = json.JSONDecoder()
    # The first "Plotly.newPlot" match sits inside the bundled library source,
    # so start the search after it.
    start = text.index("Plotly.newPlot", text.index("Plotly.newPlot") + 1)
    data, end = decoder.raw_decode(text, text.index("[", start))
    frames = []
    marker = text.find("Plotly.addFrames", end)
    if marker > 0:
        frames, _ = decoder.raw_decode(text, text.index("[", text.index(",", marker)))
    return data, frames


def convert(path, object_id, name):
    data, frames = load_figure(path)
    base = [t for t in data if t.get("name") == "Object"][0]
    track_names = [t.get("name") for t in data if str(t.get("name", "")).startswith("Track")]

    cloud = _xyz(base) * 1000.0  # metres -> millimetres
    if len(cloud) > MAX_OBJECT_POINTS:
        keep = np.linspace(0, len(cloud) - 1, MAX_OBJECT_POINTS).astype(int)
        cloud = cloud[keep]

    track_idx = list(range(len(track_names)))
    if len(track_idx) > MAX_TRACKS:
        track_idx = np.linspace(0, len(track_idx) - 1, MAX_TRACKS).astype(int).tolist()

    per_frame = []
    for frame in frames:
        traces = frame["data"]
        offset = len(traces) - len(track_names)  # object trace comes first
        positions = []
        for i in track_idx:
            pts = _xyz(traces[offset + i])
            positions.append(pts[-1] if len(pts) else [np.nan] * 3)
        per_frame.append(np.asarray(positions) * 1000.0)

    if not per_frame:
        raise SystemExit("no animation frames found in %s" % path)

    contact = np.nanmean(per_frame[0], axis=0)
    out = {
        "id": object_id,
        "name": name,
        "units": "mm",
        "frames": len(per_frame),
        "object": np.round(cloud, 1).ravel().tolist(),
        "tracks": [np.round(f, 1).ravel().tolist() for f in per_frame],
        "contact": np.round(contact, 1).tolist(),
    }
    return out


if __name__ == "__main__":
    if len(sys.argv) != 5:
        raise SystemExit(__doc__)
    src, object_id, name, out_dir = sys.argv[1:]
    payload = convert(src, object_id, name)
    dest = f"{out_dir.rstrip('/')}/{object_id}.json"
    with open(dest, "w") as fh:
        json.dump(payload, fh, separators=(",", ":"))
    print(dest, len(payload["object"]) // 3, "points,",
          len(payload["tracks"][0]) // 3, "tracks,", payload["frames"], "frames")
