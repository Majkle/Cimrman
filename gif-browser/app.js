const GIT_REPO = "Majkle/Cimrman";
const GIT_BRANCH = "master";

const CONFIG = {
  jsonUrl: `https://raw.githubusercontent.com/${GIT_REPO}/${GIT_BRANCH}/cimrman-gifs-db.json`,
  mp3BaseUrl: `https://raw.githubusercontent.com/${GIT_REPO}/${GIT_BRANCH}/data/mp3/`,
  giphyPagePrefix: "https://giphy.com/gifs/ceskatelevize-ceska-czechtv-",
  gifSize: "200w",
};

const PLAY_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.14v13.72c0 .79.87 1.27 1.54.84l11.14-6.86c.63-.39.63-1.29 0-1.68L9.54 4.3C8.87 3.87 8 4.35 8 5.14z"/></svg>`;

const searchInput = document.getElementById("search");
const grid = document.getElementById("grid");
const stats = document.getElementById("stats");
const statusEl = document.getElementById("status");
const toast = document.getElementById("toast");

let allItems = [];
let filteredItems = [];
let activeAudio = null;
let toastTimer = null;

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildSearchBlob(item) {
  const tags = item.keywords?.tags ?? [];
  const texts = item.keywords?.texts ?? [];
  return normalize([...tags, ...texts].join(" "));
}

function gifImageUrl(id) {
  return `https://i.giphy.com/media/${id}/${CONFIG.gifSize}.webp`;
}

function giphyPageUrl(id) {
  return `${CONFIG.giphyPagePrefix}${id}`;
}

function mp3Url(id) {
  return `${CONFIG.mp3BaseUrl}${id}.mp3`;
}

function hasAudio(item) {
  return Boolean(item.youtube);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast("Giphy odkaz zkopírován");
  } catch {
    showToast("Kopírování selhalo");
  }
}

function stopAudio() {
  if (!activeAudio) return;
  activeAudio.pause();
  activeAudio.currentTime = 0;
  activeAudio = null;
}

function playAudio(id) {
  stopAudio();
  const audio = new Audio(mp3Url(id));
  activeAudio = audio;
  audio.play().catch(() => showToast("Audio nelze přehrát"));
  audio.addEventListener("ended", () => {
    if (activeAudio === audio) activeAudio = null;
  });
}

function createPlayButton(item) {
  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "play-btn";
  playBtn.title = "Přehrát audio";
  playBtn.setAttribute("aria-label", "Přehrát audio");
  playBtn.innerHTML = PLAY_ICON;
  playBtn.addEventListener("click", () => playAudio(item.id));
  return playBtn;
}

function createCard(item) {
  const card = document.createElement("article");
  card.className = "card";

  const gifWrap = document.createElement("button");
  gifWrap.type = "button";
  gifWrap.className = "gif-wrap";
  gifWrap.title = "Klikni pro kopírování Giphy odkazu";

  const img = document.createElement("img");
  img.src = item.giphy?.webp || gifImageUrl(item.id);
  img.alt = (item.keywords?.texts ?? []).join(" ") || item.id;
  img.loading = "lazy";
  img.decoding = "async";
  img.width = 200;
  img.height = 200;

  gifWrap.appendChild(img);
  gifWrap.addEventListener("click", () => copyText(item.giphy?.url || giphyPageUrl(item.id)));

  const metaRow = document.createElement("div");
  metaRow.className = "meta-row";

  const meta = document.createElement("div");
  meta.className = "meta";
  const label = (item.keywords?.texts ?? []).join(" ");
  meta.textContent = label || (item.keywords?.tags ?? []).slice(0, 6).join(", ");

  metaRow.appendChild(meta);
  if (hasAudio(item)) {
    metaRow.appendChild(createPlayButton(item));
  }

  card.append(gifWrap, metaRow);
  return card;
}

function renderGrid(items) {
  grid.replaceChildren();
  const fragment = document.createDocumentFragment();

  for (const item of items) {
    fragment.appendChild(createCard(item));
  }

  grid.appendChild(fragment);
  stats.textContent = `${items.length} / ${allItems.length}`;
  statusEl.hidden = items.length > 0;
  statusEl.textContent = items.length === 0 ? "Nic nenalezeno." : "";
}

function applyFilter(query) {
  const q = normalize(query.trim());
  filteredItems = !q
    ? allItems
    : allItems.filter((item) => buildSearchBlob(item).includes(q));
  renderGrid(filteredItems);
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

async function loadJson() {
  const response = await fetch(CONFIG.jsonUrl);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function init() {
  try {
    allItems = await loadJson();
    filteredItems = allItems;
    renderGrid(filteredItems);
    searchInput.addEventListener("input", debounce((event) => applyFilter(event.target.value), 120));
    searchInput.focus();
  } catch (error) {
    stats.textContent = "Chyba";
    statusEl.hidden = false;
    statusEl.textContent = `Nepodařilo se načíst databázi: ${error.message}`;
  }
}

init();
