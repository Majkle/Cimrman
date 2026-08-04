import { CONFIG, PLAYS } from "./config.js";
import { createCard, createAudioPlayer } from "./card.js";
import { createMultiSelect } from "./multiselect.js";
import { debounce, normalize } from "./utils.js";

const searchInput = document.getElementById("search");
const grid = document.getElementById("grid");
const stats = document.getElementById("stats");
const statusEl = document.getElementById("status");
const toast = document.getElementById("toast");
const playFilterEl = document.getElementById("play-filter");
const actorFilterEl = document.getElementById("actor-filter");
const filtersRow = document.getElementById("filters-row");
const filtersToggle = document.getElementById("filters-toggle");

const FILTERS_COLLAPSED_KEY = "gif-browser-filters-collapsed";
const MOBILE_MEDIA = window.matchMedia("(max-width: 640px)");

let allItems = [];
let playFilter;
let actorFilter;
let toastTimer = null;

const audioPlayer = createAudioPlayer((message) => showToast(message));

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

function buildSearchBlob(item) {
  const tags = item.giphy?.tags ?? [];
  const texts = item.text?.split(" ") ?? [];
  return normalize([...tags, ...texts].join(" "));
}

function renderGrid(items) {
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    fragment.appendChild(
      createCard(item, {
        onCopy: copyText,
        onPlayAudio: (id) => audioPlayer.play(id),
      })
    );
  }

  grid.replaceChildren(fragment);
  stats.textContent = `${items.length} / ${allItems.length}`;
  statusEl.hidden = items.length > 0;
  statusEl.textContent = items.length === 0 ? "Nic nenalezeno." : "";
}

function getActorOptions() {
  const actorCounts = new Map();
  for (const item of allItems) {
    for (const actor of item.actors) {
      actorCounts.set(actor, (actorCounts.get(actor) || 0) + 1);
    }
  }

  return [...actorCounts.entries()]
    .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0].localeCompare(b[0])))
    .map(([actor]) => actor);
}

function populateFilters() {
  const onFilterChange = () => applyFilter(searchInput.value);

  playFilter = createMultiSelect(playFilterEl, {
    placeholder: "Hra",
    ariaLabel: "Filtrovat podle hry",
    options: PLAYS,
    onChange: onFilterChange,
  });

  actorFilter = createMultiSelect(actorFilterEl, {
    placeholder: "Cimrmanolog",
    ariaLabel: "Filtrovat podle herce",
    options: getActorOptions(),
    onChange: onFilterChange,
  });
}

function applyFilter(query) {
  const q = normalize(query.trim());
  const selectedPlays = playFilter.getSelected();
  const selectedActors = actorFilter.getSelected();

  const filtered = allItems.filter((item) => {
    const matchesSearch = !q || buildSearchBlob(item).includes(q);
    const matchesPlay = selectedPlays.length === 0 || selectedPlays.includes(item.play);
    const matchesActor =
      selectedActors.length === 0 ||
      item.actors?.some((actor) => selectedActors.includes(actor));

    return matchesSearch && matchesPlay && matchesActor;
  });

  renderGrid(filtered);
}

async function loadJson() {
  const response = await fetch(CONFIG.jsonUrl);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

function setFiltersCollapsed(collapsed) {
  filtersRow.classList.toggle("filters-row--collapsed", collapsed);
  filtersToggle.setAttribute("aria-expanded", String(!collapsed));
  filtersToggle.textContent = collapsed ? "Filtry" : "Skrýt filtry";
  if (MOBILE_MEDIA.matches) {
    localStorage.setItem(FILTERS_COLLAPSED_KEY, String(collapsed));
  }
}

function initFiltersToggle() {
  const updateVisibility = () => {
    const isMobile = MOBILE_MEDIA.matches;
    filtersToggle.hidden = !isMobile;

    if (!isMobile) {
      filtersRow.classList.remove("filters-row--collapsed");
      filtersToggle.setAttribute("aria-expanded", "true");
      return;
    }

    const collapsed = localStorage.getItem(FILTERS_COLLAPSED_KEY) === "true";
    setFiltersCollapsed(collapsed);
  };

  filtersToggle.addEventListener("click", () => {
    setFiltersCollapsed(!filtersRow.classList.contains("filters-row--collapsed"));
  });

  MOBILE_MEDIA.addEventListener("change", updateVisibility);
  updateVisibility();
}

async function init() {
  try {
    allItems = await loadJson();
    populateFilters();
    initFiltersToggle();
    renderGrid(allItems);
    searchInput.addEventListener("input", debounce((event) => applyFilter(event.target.value), 120));
    if (!filtersRow.classList.contains("filters-row--collapsed")) {
      searchInput.focus();
    }
  } catch (error) {
    stats.textContent = "Chyba";
    statusEl.hidden = false;
    statusEl.textContent = `Nepodařilo se načíst databázi: ${error.message}`;
  }
}

init();
