import json
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

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

def process_item(dto, output_dir):
    giphyUrl = dto["giphy"]["url"]
    filename = giphyUrl.split("-")[-1] + ".mp3"

    if "youtube" not in dto:
        return f"Skipping {filename} (no youtube)"

    start = to_timestamp(max(0, to_seconds(dto["youtube"]["timestamp"]["start"]) - 2))
    end = to_timestamp(to_seconds(dto["youtube"]["timestamp"]["end"]) + 2)
    output = output_dir / filename

    # yt-dlp uses template variables for output, ensure extension handles correctly
    output_template = output.with_suffix('')

    cmd = [
        "yt-dlp",
        "-x", 
        # "-k", # keep video file
        "--js-runtimes", "node",
        "--audio-format", "mp3",
        "--extractor-args", "youtube:player_client=android",
        "--download-sections", f"*{start}-{end}",
        "-o", str(output_template) + ".%(ext)s",
        dto["youtube"]["url"],
    ]

    print(f"Downloading {filename}...")

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        return f"✓ Saved {output}"
    else:
        raise Exception(f"✗ Failed {dto['youtube']['url']}: {result.stderr.strip()}")

def main():
    INPUT_FILE = "../cimrman-gifs-db.json"
    OUTPUT_DIR = Path("../data/mp3")
    MAX_WORKERS = 8  # Adjust the number of concurrent threads as needed

    OUTPUT_DIR.mkdir(exist_ok=True)

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        items = json.load(f)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(process_item, dto, OUTPUT_DIR): dto for dto in items}

        for future in as_completed(futures):
            try:
                msg = future.result()
                print(msg)
            except Exception as e:
                print(e)
                # If you want it to abort entirely on the first failure, you can re-raise or break here.

if __name__ == "__main__":
    main()