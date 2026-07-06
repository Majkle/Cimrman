import json
import os
import requests
import time
from glob import glob
from concurrent.futures import ThreadPoolExecutor, as_completed

# === CONFIG ===
FEED_DIR = "../data/feed"
OUTPUT_DIR = "../data/gifs"
TAGS_DIR = "../data/gif_tags"
MAX_WORKERS = 10
RETRY_LIMIT = 3

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TAGS_DIR, exist_ok=True)

# Tags to exclude (case-insensitive)
EXCLUDED_TAGS = {
    "ceskatelevize", "czechtv", "ceska", "televize",
    "divadlo", "cimrman", "jary", "cimrmani", "cimrmana",
    "divadlojarycimrmana"
}

def download_gif(url, filename, retries=RETRY_LIMIT):
    """Download a single GIF with retries."""
    for attempt in range(1, retries + 1):
        try:
            r = requests.get(url, stream=True, timeout=20)
            if r.status_code == 200:
                with open(filename, "wb") as f:
                    for chunk in r.iter_content(1024):
                        f.write(chunk)
                return f"✅ {os.path.basename(filename)}"
            else:
                return f"⚠️ Failed ({r.status_code}) - {url}"
        except Exception as e:
            if attempt < retries:
                time.sleep(1)
            else:
                return f"❌ Error downloading {url}: {e}"


def save_tags(gif_id, tags):
    """Save filtered tags to file."""
    cleaned = [
        t for t in tags
        if t.lower() not in EXCLUDED_TAGS and len(t.strip()) > 0
    ]
    if not cleaned:
        return
    path = os.path.join(TAGS_DIR, f"{gif_id}.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(cleaned))


def process_feed_file(filepath):
    """Read one feed JSON file and return (url, filename) pairs."""
    print(f"\n📂 Processing: {filepath}")
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ Failed to read {filepath}: {e}")
        return []

    results = data.get("results", [])
    print(f"Found {len(results)} GIFs")

    tasks = []
    for item in results:
        try:
            gif_url = item["images"]["original"]["url"]
            gif_id = item.get("id", "unknown")
            filename = os.path.join(OUTPUT_DIR, f"{gif_id}.gif")

            # --- Save tags ---
            tags = item.get("tags", [])
            save_tags(gif_id, tags)

            if not os.path.exists(filename):
                tasks.append((gif_url, filename))
            else:
                print(f"⏩ Skipping (exists): {filename}")
        except KeyError:
            print(f"⚠️ Missing 'original.url' in item {item.get('id')}")
    return tasks


def main():
    json_files = sorted(glob(os.path.join(FEED_DIR, "*.json")))
    if not json_files:
        print(f"❌ No JSON files found in {FEED_DIR}")
        return

    all_tasks = []
    for filepath in json_files:
        all_tasks.extend(process_feed_file(filepath))

    print(f"\n🚀 Starting parallel downloads ({len(all_tasks)} GIFs total)...")

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(download_gif, url, filename) for url, filename in all_tasks]
        for future in as_completed(futures):
            print(future.result())

    print("\n✅ All downloads and tag extraction finished!")


if __name__ == "__main__":
    main()
