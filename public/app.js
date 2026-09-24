import { Loader } from "./js/loader.js";
import { GtaMap } from "./js/map.js";
import { renderStyleOptions } from "./js/layers.js";

const searchEl = document.getElementById("search");
const cycleEl = document.getElementById("cycle");
const styleEl = document.getElementById("style");
const refreshEl = document.getElementById("refresh");
const fitVisibleEl = document.getElementById("fit-visible");
const resetFiltersEl = document.getElementById("reset-filters");
const showAllCatsEl = document.getElementById("show-all-cats");
const hideAllCatsEl = document.getElementById("hide-all-cats");
const toggleCatsEl = document.getElementById("toggle-cats");
const categoryPanelEl = document.getElementById("category-panel");
const summaryEl = document.getElementById("summary");
const listEl = document.getElementById("list");

const CATEGORY_GLYPHS = {
  nuclear_waste: "☢",
  letter_scrap: "✉",
  stunt_jump: "⤴",
  under_the_bridge: "🌉",
  knife_flight: "✈",
  spaceship_part: "✦",
  epsilon_car: "ε",
  epsilon_tract: "ε",
  money: "💲",
  vehicle_spawn: "🚗",
};

Loader.init({
  mapConfig: "/api/map/config",
  categoryStats: "/api/categories/stats",
});

const mapConfig = await Loader.json("mapConfig");
const categoryStats = await Loader.json("categoryStats");

renderStyleOptions(styleEl, mapConfig);

let tileErrors = 0;
const gtaMap = new GtaMap({
  containerID: "map",
  mapConfig,
  onTileError: (styleKey) => {
    tileErrors += 1;
    summaryEl.textContent = `Map tiles failing (${tileErrors}) on '${styleKey}'.`;
  },
});

const allCategories = categoryStats.categories.map((entry) => entry.category);
const enabledCategories = new Set(allCategories);

function parseState() {
  const params = new URLSearchParams(location.hash.startsWith("#") ? location.hash.slice(1) : "");
  return {
    q: params.get("q") ?? "",
    cycle: params.get("cycle") ?? "",
    style: params.get("style") ?? "",
    cats: params.get("cats")?.split(",").filter(Boolean) ?? null,
    z: params.get("z") ? Number(params.get("z")) : null,
    lat: params.get("lat") ? Number(params.get("lat")) : null,
    lng: params.get("lng") ? Number(params.get("lng")) : null,
    cc: params.get("cc") === "1",
  };
}

let collapsedCats = false;

function writeState() {
  const view = gtaMap.getView();
  const params = new URLSearchParams();
  if (searchEl.value.trim()) params.set("q", searchEl.value.trim());
  if (cycleEl.value) params.set("cycle", cycleEl.value);
  if (styleEl.value) params.set("style", styleEl.value);
  if (enabledCategories.size !== allCategories.length) params.set("cats", [...enabledCategories].join(","));
  params.set("z", String(view.zoom));
  params.set("lat", view.lat.toFixed(5));
  params.set("lng", view.lng.toFixed(5));
  if (collapsedCats) params.set("cc", "1");
  history.replaceState(null, "", `#${params.toString()}`);
}

function buildCollectiblesUrl() {
  const params = new URLSearchParams();
  if (searchEl.value.trim()) params.set("q", searchEl.value.trim());
  if (cycleEl.value) params.set("cycle", cycleEl.value);
  return `/api/collectibles?${params.toString()}`;
}

function renderCategoryPanel() {
  categoryPanelEl.classList.toggle("collapsed", collapsedCats);
  toggleCatsEl.textContent = collapsedCats ? "Expand" : "Collapse";
  categoryPanelEl.innerHTML = "";
  for (const entry of categoryStats.categories) {
    const row = document.createElement("label");
    row.className = "cat-row";

    const left = document.createElement("span");
    left.className = "cat-left";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = enabledCategories.has(entry.category);

    const glyph = document.createElement("span");
    glyph.className = "cat-glyph";
    glyph.textContent = CATEGORY_GLYPHS[entry.category] ?? "◆";

    const name = document.createElement("span");
    name.className = "cat-name";
    name.textContent = entry.setLabel;

    left.append(checkbox, glyph, name);

    const count = document.createElement("span");
    count.className = "cat-count";
    count.textContent = String(entry.count);

    row.append(left, count);
    categoryPanelEl.append(row);

    checkbox.addEventListener("change", async () => {
      if (checkbox.checked) enabledCategories.add(entry.category);
      else enabledCategories.delete(entry.category);
      writeState();
      await loadCollectibles();
    });
  }
}

async function loadCollectibles() {
  const response = await fetch(buildCollectiblesUrl());
  const data = await response.json();

  const visible = data.items.filter((row) => enabledCategories.has(row.category));
  summaryEl.textContent = `${visible.length} visible · ${data.items.length} loaded`;
  listEl.innerHTML = "";

  const selectListItem = (slug) => {
    listEl.querySelectorAll("li").forEach((node) => node.classList.toggle("active", node.dataset.slug === slug));
  };

  gtaMap.setPins(
    visible,
    {
      onSelect: (slug) => selectListItem(slug),
    },
    {
      autoFit: false,
    },
  );

  for (const row of visible) {
    const li = document.createElement("li");
    li.dataset.slug = row.slug;
    const glyph = CATEGORY_GLYPHS[row.category] ?? "◆";
    const set = row.setLabel ?? row.category;
    const order = row.order ? ` #${row.order}` : "";
    li.innerHTML = `<strong><span class="row-glyph">${glyph}</span>${row.name}</strong><br><small>${set}${order}</small>`;
    li.addEventListener("mouseenter", () => gtaMap.focusPin(row.slug, { fly: false }));
    li.addEventListener("click", () => {
      gtaMap.focusPin(row.slug, { openPopup: true });
      selectListItem(row.slug);
    });
    listEl.append(li);
  }

  writeState();
}

styleEl.addEventListener("change", () => gtaMap.setStyle(styleEl.value));
styleEl.addEventListener("change", () => writeState());
refreshEl.addEventListener("click", loadCollectibles);
fitVisibleEl.addEventListener("click", () => gtaMap.fitPins());
showAllCatsEl.addEventListener("click", async () => {
  for (const category of allCategories) enabledCategories.add(category);
  renderCategoryPanel();
  writeState();
  await loadCollectibles();
});
hideAllCatsEl.addEventListener("click", async () => {
  enabledCategories.clear();
  renderCategoryPanel();
  writeState();
  await loadCollectibles();
});
resetFiltersEl.addEventListener("click", async () => {
  searchEl.value = "";
  cycleEl.value = "";
  for (const category of allCategories) enabledCategories.add(category);
  renderCategoryPanel();
  writeState();
  await loadCollectibles();
});
cycleEl.addEventListener("change", loadCollectibles);
searchEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loadCollectibles();
});

toggleCatsEl.addEventListener("click", () => {
  collapsedCats = !collapsedCats;
  renderCategoryPanel();
  writeState();
});

gtaMap.map.on("moveend zoomend", () => writeState());

document.addEventListener("keydown", async (event) => {
  const target = event.target;
  const isInput = target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
  if (isInput) return;

  if (event.key === "/") {
    event.preventDefault();
    searchEl.focus();
    searchEl.select();
    return;
  }
  if (event.key.toLowerCase() === "r") return loadCollectibles();
  if (event.key === "0") return gtaMap.fitPins();
  if (event.key.toLowerCase() === "h") {
    enabledCategories.clear();
    renderCategoryPanel();
    return loadCollectibles();
  }
  if (event.key.toLowerCase() === "s") {
    for (const category of allCategories) enabledCategories.add(category);
    renderCategoryPanel();
    return loadCollectibles();
  }
});

const state = parseState();
searchEl.value = state.q;
cycleEl.value = state.cycle;
if (state.style && mapConfig.styles[state.style]) {
  styleEl.value = state.style;
  gtaMap.setStyle(state.style);
}
if (state.cats) {
  enabledCategories.clear();
  for (const category of state.cats) {
    if (allCategories.includes(category)) enabledCategories.add(category);
  }
}
collapsedCats = state.cc;
renderCategoryPanel();

if (Number.isFinite(state.z) && Number.isFinite(state.lat) && Number.isFinite(state.lng)) {
  gtaMap.setView(state.lat, state.lng, state.z);
}

await loadCollectibles();
