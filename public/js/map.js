const CATEGORY_STYLES = {
  nuclear_waste: { color: "#6ec8ff", glyph: "☢" },
  letter_scrap: { color: "#f2d39b", glyph: "✉" },
  stunt_jump: { color: "#ffb86b", glyph: "⤴" },
  under_the_bridge: { color: "#b694ff", glyph: "🌉" },
  knife_flight: { color: "#ff7ecb", glyph: "✈" },
  spaceship_part: { color: "#7ef7ff", glyph: "✦" },
  epsilon_car: { color: "#ff7a7a", glyph: "ε" },
  epsilon_tract: { color: "#d890ff", glyph: "ε" },
  money: { color: "#7ee787", glyph: "💲" },
  vehicle_spawn: { color: "#ffe66d", glyph: "🚗" },
};

function fallbackStyle(category) {
  const palette = ["#7ee787", "#6ec8ff", "#ffb86b", "#b694ff", "#ff7ecb", "#ffe66d", "#7ef7ff"];
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  const color = palette[hash % palette.length];
  return { color, glyph: "◆" };
}

function markerStyle(category) {
  return CATEGORY_STYLES[category] ?? fallbackStyle(category);
}

function markerIcon(color, glyph) {
  return L.divIcon({
    className: "",
    html: `<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:999px;background:${color};border:2px solid #101217;color:#0e1218;font:800 11px/1 Inter,system-ui,sans-serif">${glyph}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function markerIconActive(color, glyph) {
  return L.divIcon({
    className: "",
    html: `<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:${color};border:2px solid #fff;box-shadow:0 0 0 4px rgba(255,255,255,.25);color:#0e1218;font:900 13px/1 Inter,system-ui,sans-serif">${glyph}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export class GtaMap {
  constructor({ containerID, mapConfig, onTileError }) {
    this.mapConfig = mapConfig;
    this.onTileError = onTileError;

    this.map = L.map(containerID, {
      minZoom: mapConfig.minZoom,
      maxZoom: mapConfig.maxZoom,
      attributionControl: false,
      zoomControl: false,
      maxBounds: mapConfig.maxBounds
        ? [
            [mapConfig.maxBounds.south, mapConfig.maxBounds.west],
            [mapConfig.maxBounds.north, mapConfig.maxBounds.east],
          ]
        : undefined,
      maxBoundsViscosity: mapConfig.maxBounds ? 1 : 0,
    });

    L.control
      .zoom({
        position: "bottomright",
      })
      .addTo(this.map);

    this.layers = {};
    for (const [key, style] of Object.entries(mapConfig.styles)) {
      const layer = L.tileLayer(style.url, {
        minZoom: mapConfig.minZoom,
        maxZoom: mapConfig.maxZoom,
        tileSize: 256,
        tms: false,
        noWrap: true,
        bounds: mapConfig.maxBounds
          ? [
              [mapConfig.maxBounds.south, mapConfig.maxBounds.west],
              [mapConfig.maxBounds.north, mapConfig.maxBounds.east],
            ]
          : undefined,
      });
      layer.on("tileerror", () => this.onTileError?.(key));
      this.layers[key] = layer;
    }

    const selectedStyle = this.layers[mapConfig.defaultStyle] ? mapConfig.defaultStyle : Object.keys(this.layers)[0];
    this.activeStyle = selectedStyle;
    this.layers[selectedStyle].addTo(this.map);
    const initial = mapConfig.initialView ?? { lat: 66, lng: -125, zoom: 4 };
    this.map.setView([initial.lat, initial.lng], initial.zoom);

    this.markersLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: Math.max(mapConfig.maxZoom - 1, mapConfig.minZoom + 1),
      maxClusterRadius: 42,
    }).addTo(this.map);
    this.markerById = new Map();
    this.lastBounds = null;
    this.activeId = null;

    this._addFitControl();
  }

  _addFitControl() {
    const control = L.control({ position: "bottomright" });
    control.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-bar gc-mapctl");
      const button = L.DomUtil.create("a", "gc-mapctl-fit", div);
      button.href = "#";
      button.title = "Fit all visible markers";
      button.setAttribute("role", "button");
      button.textContent = "◎";

      L.DomEvent.on(button, "click", (event) => {
        L.DomEvent.stop(event);
        this.fitPins();
      });
      L.DomEvent.disableClickPropagation(div);
      return div;
    };
    control.addTo(this.map);
  }

  setStyle(styleKey) {
    if (!this.layers[styleKey] || styleKey === this.activeStyle) return;
    this.map.removeLayer(this.layers[this.activeStyle]);
    this.layers[styleKey].addTo(this.map);
    this.activeStyle = styleKey;
  }

  setPins(items, hooks = {}, options = {}) {
    const { onSelect } = hooks;
    const { autoFit = false } = options;
    this.markersLayer.clearLayers();
    this.markerById.clear();
    this.activeId = null;
    const bounds = [];

    for (const row of items) {
      const point = [row.coords.y, row.coords.x];
      const style = markerStyle(row.category);
      const color = style.color;
      const glyph = style.glyph;
      const marker = L.marker(point, {
        icon: markerIcon(color, glyph),
      });

      const set = row.setLabel ?? row.category;
      const order = row.order ? `#${row.order}` : "";
      const notes = row.notes ? `<br>${row.notes}` : "";
      const video = row.video?.yt_id
        ? `<br><a href="https://www.youtube.com/watch?v=${row.video.yt_id}" target="_blank" rel="noopener noreferrer">Guide video</a>`
        : "";

      marker.bindPopup(`
        <strong>${row.name}</strong><br>
        Set: ${set} ${order}<br>
        Coords: ${row.coords.x.toFixed(3)}, ${row.coords.y.toFixed(3)}
        ${notes}
        ${video}
      `);

      marker.on("mouseover", () => {
        if (this.activeId !== row.slug) marker.setIcon(markerIconActive(color, glyph));
      });
      marker.on("mouseout", () => {
        if (this.activeId !== row.slug) marker.setIcon(markerIcon(color, glyph));
      });
      marker.on("click", () => {
        this.focusPin(row.slug, { openPopup: true });
        onSelect?.(row.slug);
      });

      marker.addTo(this.markersLayer);
      this.markerById.set(row.slug, { marker, color, glyph });
      bounds.push(point);
    }

    this.lastBounds = bounds.length > 1 ? L.latLngBounds(bounds) : null;
    if (autoFit && this.lastBounds) this.map.fitBounds(this.lastBounds, { padding: [40, 40] });
    return bounds;
  }

  focusPin(id, opts = {}) {
    const { openPopup = false, fly = true } = opts;
    const target = this.markerById.get(id);
    if (!target) return;

    if (this.activeId && this.markerById.has(this.activeId)) {
      const prev = this.markerById.get(this.activeId);
      prev.marker.setIcon(markerIcon(prev.color, prev.glyph));
    }

    this.activeId = id;
    target.marker.setIcon(markerIconActive(target.color, target.glyph));
    if (fly) this.map.flyTo(target.marker.getLatLng(), Math.max(this.map.getZoom(), 5), { duration: 0.45 });
    if (openPopup) target.marker.openPopup();
  }

  fitPins() {
    if (!this.lastBounds) return;
    this.map.fitBounds(this.lastBounds, { padding: [40, 40] });
  }

  setView(lat, lng, zoom) {
    this.map.setView([lat, lng], zoom);
  }

  getView() {
    const c = this.map.getCenter();
    return { lat: c.lat, lng: c.lng, zoom: this.map.getZoom() };
  }
}
