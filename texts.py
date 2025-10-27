import os
import re
import requests
from spellchecker import SpellChecker
from PIL import Image, ImageSequence
import pytesseract
from concurrent.futures import ProcessPoolExecutor, as_completed

# Paths
gif_folder = "data/gifs"
output_folder = "data/gif_texts"
os.makedirs(output_folder, exist_ok=True)

# Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

custom_config = r'--oem 3 --psm 6'

def preprocess_frame(frame):
    """Preprocess frame for better OCR of white text on dark background."""
    width, height = frame.size
    frame = frame.crop((0, height // 2, width, height))
    gray = frame.convert("L")
    gray = gray.point(lambda x: 0 if x < 200 else 255, '1')
    # gray.show()
    return gray

def clean_text(text):
    """Remove newlines and filter out nonsense OCR results."""
    # Remove newlines and extra spaces
    text = text.replace("\n", " ").replace("\r", " ").replace("!", "").replace("?", "").replace(",", "").replace("'", "").replace(".", "")
    text = re.sub(r"\s+", " ", text).strip()

    # Keep only words that have letters (Czech included)
    words = text.split()
    valid_words = [w for w in words if re.fullmatch(r"[A-Z0-9ÁÉÍÓÚÝČĎĚŇŘŠŤŽAŮ]+", w)]

    # Rejoin cleaned words
    return " ".join(valid_words).lower()

def extract_text_from_gif(gif_path, max_frames=10):
    """Extract Czech text from the first frame that contains any text."""
    try:
        with Image.open(gif_path) as im:
            for i, frame in enumerate(ImageSequence.Iterator(im)):
                if i >= max_frames:
                    break
                processed_frame = preprocess_frame(frame)
                frame_text = pytesseract.image_to_string(processed_frame, lang='ces', config=custom_config)
                if frame_text.strip():
                    cleaned = clean_text(frame_text)
                    # print(f"{frame_text}->\n{cleaned}")
                    print(f"{cleaned}")
                    return os.path.basename(gif_path), cleaned
    except Exception as e:
        return os.path.basename(gif_path), f"Error: {e}"
    return os.path.basename(gif_path), ""

def process_all_gifs():
    gifs = [os.path.join(gif_folder, f) for f in os.listdir(gif_folder) if f.lower().endswith(".gif")]
    # gifs=[os.path.join(gif_folder, "chEfCilddB5lUQ0eKq.gif")]

    with (ProcessPoolExecutor() as executor):
        futures = {executor.submit(extract_text_from_gif, gif): gif for gif in gifs}

        for future in as_completed(futures):
            filename, text = future.result()
            if text and not text.startswith("Error:"):
                text_filename = os.path.splitext(filename)[0] + ".txt"
                output_path = os.path.join(output_folder, text_filename)
                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(text)
                print(f"Processed {filename} → {text_filename}")
            else:
                print(f"No text found in {filename}, skipping.")

if __name__ == "__main__":
    process_all_gifs()
    print("All GIFs processed!")
