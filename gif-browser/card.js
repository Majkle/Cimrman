import { CONFIG, ICONS } from "./config.js";

export function gifImageUrl(id) {
  return `https://i.giphy.com/media/${id}/${CONFIG.gifSize}.webp`;
}

export function giphyPageUrl(id) {
  return `${CONFIG.giphyPagePrefix}${id}`;
}

function mp3Url(id) {
  return `${CONFIG.mp3BaseUrl}${id}.mp3`;
}

function hasAudio(item) {
  return Boolean(item?.youtube?.timestamp?.start !== "" && item?.youtube?.timestamp?.end !== "");
}

function hasYoutube(item) {
  return Boolean(item?.youtube?.url && item?.youtube?.timestamp?.start);
}

function timestampToSeconds(timestamp) {
  const parts = String(timestamp ?? "").split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function youtubeTimestampUrl(item) {
  const url = new URL(item.youtube.url);
  url.searchParams.set("t", String(timestampToSeconds(item.youtube.timestamp.start)));
  return url.toString();
}

function createIconButton({ className, title, label, iconUrl, onClick }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.title = title;
  btn.setAttribute("aria-label", label);

  const img = document.createElement("img");
  img.src = iconUrl;
  img.alt = "";
  img.width = 16;
  img.height = 16;
  img.decoding = "async";
  btn.appendChild(img);

  btn.addEventListener("click", onClick);
  return btn;
}

function createIconLink({ className, title, label, href, iconUrl }) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = className;
  link.title = title;
  link.setAttribute("aria-label", label);

  const img = document.createElement("img");
  img.src = iconUrl;
  img.alt = "";
  img.width = 16;
  img.height = 16;
  img.decoding = "async";
  link.appendChild(img);

  return link;
}

export function createCard(item, { onCopy, onPlayAudio }) {
  const card = document.createElement("article");
  card.className = "card";

  const gifWrap = document.createElement("button");
  gifWrap.type = "button";
  gifWrap.className = "gif-wrap";
  gifWrap.title = "Klikni pro kopírování Giphy odkazu";

  const img = document.createElement("img");
  img.src = item.giphy?.webp || gifImageUrl(item.id);
  img.alt = item.text;
  img.loading = "lazy";
  img.decoding = "async";
  img.width = 200;
  img.height = 200;

  gifWrap.appendChild(img);
  gifWrap.addEventListener("click", () => onCopy(item.giphy?.url || giphyPageUrl(item.id)));

  const metaRow = document.createElement("div");
  metaRow.className = "meta-row";

  const meta = document.createElement("div");
  meta.className = "meta";
  metaRow.appendChild(meta);

  if (hasAudio(item) || hasYoutube(item)) {
    const actions = document.createElement("div");
    actions.className = "card-actions";

    if (hasAudio(item)) {
      actions.appendChild(
        createIconButton({
          className: "action-btn audio-btn",
          title: "Přehrát audio",
          label: "Přehrát audio",
          iconUrl: ICONS.audio,
          onClick: () => onPlayAudio(item.id),
        })
      );
    }

    if (hasYoutube(item)) {
      actions.appendChild(
        createIconLink({
          className: "action-btn youtube-btn",
          title: "Otevřít na YouTube",
          label: "Otevřít na YouTube",
          href: youtubeTimestampUrl(item),
          iconUrl: ICONS.youtube,
        })
      );
    }

    metaRow.appendChild(actions);
  }

  card.append(gifWrap, metaRow);
  return card;
}

export function createAudioPlayer(onError) {
  let activeAudio = null;

  return {
    stop() {
      if (!activeAudio) return;
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    },
    play(id) {
      this.stop();
      const audio = new Audio(mp3Url(id));
      activeAudio = audio;
      audio.play().catch(() => onError("Audio nelze přehrát"));
      audio.addEventListener("ended", () => {
        if (activeAudio === audio) activeAudio = null;
      });
    },
  };
}
