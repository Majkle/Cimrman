import json
import subprocess
from pathlib import Path

def to_seconds(t):
    parts = list(map(int, t.split(":")))
    
    if len(parts) == 2:          # MM:SS
        m, s = parts
        return m * 60 + s
    elif len(parts) == 3:        # HH:MM:SS
        h, m, s = parts
        return h * 3600 + m * 60 + s
    else:
        raise ValueError(f"Invalid timestamp: {t}")
    
def to_timestamp(sec):
    h = sec // 3600
    sec %= 3600
    m = sec // 60
    s = sec % 60

    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"

INPUT_FILE = "../cimrman-gifs-db.json"
OUTPUT_DIR = Path("../data/mp3")

OUTPUT_DIR.mkdir(exist_ok=True)

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    items = json.load(f)

for dto in items:
    giphyUrl = dto["giphy"]["url"]
    filename = giphyUrl.split("-")[-1] + ".mp3"
    
    if "youtube" not in dto:
        print(f"Skipping {filename} (no youtube)")
        continue

    start = to_timestamp(max(0, to_seconds(dto["youtube"]["timestamp"]["start"]) - 2))
    end = to_timestamp(to_seconds(dto["youtube"]["timestamp"]["end"]) + 2)
    output = OUTPUT_DIR / filename

    cmd = [
        "yt-dlp",
        "-x", 
        # "-k", # keep video file
        "--js-runtimes", "node",
        "--audio-format", "mp3",
        "--extractor-args", "youtube:player_client=android",
        "--download-sections", f"*{start}-{end}",
        "-o", str(output),
        dto["youtube"]["url"],
    ]

    print(f"Downloading {filename}...")

    result = subprocess.run(cmd)

    if result.returncode == 0:
        print(f"✓ Saved {output}")
    else:
        raise Exception(f"✗ Failed {dto["youtube"]['url']}")