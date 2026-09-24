const map = L.map("map", { zoomControl: true }).setView([34.0522, -118.2437], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const searchEl = document.getElementById("search");
const categoryEl = document.getElementById("category");
const cycleEl = document.getElementById("cycle");
const refreshEl = document.getElementById("refresh");
const summaryEl = document.getElementById("summary");
const listEl = document.getElementById("list");

const markersLayer = L.layerGroup().addTo(map);

function markerColor(category) {
  if (category.includes("jammer")) return "#ff5d5d";
  if (category.includes("card")) return "#ffc857";
  if (category.includes("figure")) return "#64d2ff";
  if (category.includes("prop")) return "#9b8cff";
  return "#7ee787";
}

function markerIcon(color) {
  return L.divIcon({
    className: "",
    html: `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #101217"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

async function loadCategories() {
  const response = await fetch("/api/categories");
  const data = await response.json();
  for (const category of data.categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryEl.append(option);
  }
}

function buildUrl() {
  const params = new URLSearchParams();
  if (searchEl.value.trim()) params.set("q", searchEl.value.trim());
  if (categoryEl.value) params.set("category", categoryEl.value);
  if (cycleEl.value) params.set("cycle", cycleEl.value);
  return `/api/collectibles?${params.toString()}`;
}

async function loadCollectibles() {
  const response = await fetch(buildUrl());
  const data = await response.json();

  markersLayer.clearLayers();
  listEl.innerHTML = "";

  summaryEl.textContent = `${data.total} collectibles visible`;

  const bounds = [];

  for (const row of data.items) {
    const marker = L.marker([row.coords.y, row.coords.x], {
      icon: markerIcon(markerColor(row.category)),
    });

    marker.bindPopup(`
      <strong>${row.name}</strong><br>
      Category: ${row.category}<br>
      Cycle: ${row.cycle}<br>
      Payout: $${row.payout.toLocaleString()}
    `);
    marker.addTo(markersLayer);

    bounds.push([row.coords.y, row.coords.x]);

    const li = document.createElement("li");
    li.innerHTML = `<strong>${row.name}</strong><br><small>${row.category} · cycle ${row.cycle} · $${row.payout.toLocaleString()}</small>`;
    li.addEventListener("click", () => {
      map.flyTo([row.coords.y, row.coords.x], 14, { duration: 0.6 });
      marker.openPopup();
    });
    listEl.append(li);
  }

  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

refreshEl.addEventListener("click", loadCollectibles);
categoryEl.addEventListener("change", loadCollectibles);
cycleEl.addEventListener("change", loadCollectibles);
searchEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loadCollectibles();
});

await loadCategories();
await loadCollectibles();
