# Cimrman GIFy

[Prohlížeč a databáze GIFů z Divadla Járy Cimrmana](https://majkle.github.io/Cimrman/gif-browser/).

## Inspirace

Inspirace od [cimrman_gifs](https://github.com/m-k-l-s/cimrman_gifs) od [m-k-l-s](https://github.com/m-k-l-s).

## Databáze

Hlavní datový soubor je `cimrman-gifs-db.json` — pole objektů, každý reprezentuje jeden GIF.

### Schéma záznamu

```json
{
  "id": "string — identifikátor GIFu na Giphy, název souboru MP3 v data/mp3/",
  "text": "string — text zobrazený na GIFu",
  "play": "string — název hry",
  "actors": ["string — postava / herec"],
  "giphy": {
    "url": "string — odkaz na Giphy",
    "tags": ["string — tag pro vyhledávání"]
  },
  "youtube": {
    "url": "string — URL videa",
    "timestamp": {
      "start": "string — MM:SS nebo HH:MM:SS",
      "end": "string — MM:SS nebo HH:MM:SS"
    }
  }
}
```

### Související soubory

- `data/mp3/{id}.mp3` — audio výřez z YouTube (generuje `scripts/download-mp3.py`)
- `data/feed/*.json` — surová data z Giphy API (kanál České televize)
- `gif-browser/` — webová aplikace pro prohlížení a vyhledávání
