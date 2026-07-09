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
const playFilter = document.getElementById("play-filter");
const actorFilter = document.getElementById("actor-filter");

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
  const tags = item.giphy?.tags ?? [];
  const texts = item.text?.split(" ") ?? [];
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
  return Boolean(item?.youtube?.timestamp?.start !== "" && item?.youtube?.timestamp?.end !== "");
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
  img.alt = item.text;
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

function populateFilters() {
  const plays = [
    "Akt",
    "Vyšetřování ztráty třídní knihy",
    "Hospoda Na Mýtince",
    "Vražda v salonním coupé",
    "Němý Bobeš",
    "Cimrman v říši hudby",
    "Dlouhý, Široký a Krátkozraký",
    "Posel z Liptákova",
    "Lijavec",
    "Dobytí severního pólu",
    "Blaník",
    "Záskok",
    "Švestka",
    "Afrika",
    "České nebe"
  ];
  playFilter.innerHTML = plays.map(p => `<option value="${p}">${p}</option>`).join("");

  const actorCounts = new Map();
  allItems.forEach(item => {
      item.actors.forEach(actor => {
        actorCounts.set(actor, (actorCounts.get(actor) || 0) + 1);
      });
  });

  actorFilter.innerHTML = [...actorCounts.entries()]
    .sort((a, b) => {
      // Sort by frequency (descending), then alphabetically
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .map(([actor]) => `<option value="${actor}">${actor}</option>`)
    .join("");

  playFilter.addEventListener("change", () => applyFilter(searchInput.value));
  actorFilter.addEventListener("change", () => applyFilter(searchInput.value));
}

function applyFilter(query) {
  const q = normalize(query.trim());

  const selectedPlays = Array.from(playFilter.selectedOptions).map(o => o.value);
  const selectedActors = Array.from(actorFilter.selectedOptions).map(o => o.value);

  filteredItems = allItems.filter((item) => {
    const matchesSearch = !q ? true : buildSearchBlob(item).includes(q);
    const matchesPlay = selectedPlays.length === 0 || selectedPlays.includes(item.play);
    const matchesActor = selectedActors.length === 0 ||
      (item.actors && item.actors.some(actor => selectedActors.includes(actor)));

    return matchesSearch && matchesPlay && matchesActor;
  });

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

    populateFilters();
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
