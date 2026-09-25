// GreyZone Monitor: page script.
// Reads data/incidents.json only. data/held.json is never loaded.

const GRADE_NAMES = {
  attributed: "Attributed",
  suspected: "Suspected",
  unattributed: "Unattributed",
  withdrawn: "Withdrawn",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

// Dates can be YYYY, YYYY-MM or YYYY-MM-DD.
function formatDate(value) {
  const [y, m, d] = value.split("-");
  if (!m) return y;
  if (!d) return `${MONTHS[Number(m) - 1]} ${y}`;
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

// Covers the site's scope: EU, UK, Norway, Switzerland, Moldova and the Western Balkans.
const EUROPE_BOUNDS = [[36, -11], [71, 32]];

// Marker shapes, 16px. The shape carries the grade, so it reads without colour.
const MARKER_SVG = {
  attributed: '<circle class="mk-fill" cx="8" cy="8" r="7"/>',
  suspected: '<circle class="mk-ring" cx="8" cy="8" r="6" stroke-width="3"/><circle class="mk-dot" cx="8" cy="8" r="2"/>',
  unattributed: '<circle class="mk-ring" cx="8" cy="8" r="6.5" stroke-width="2" stroke-dasharray="3.4 2.4"/>',
  withdrawn: '<circle class="mk-withdrawn" cx="8" cy="8" r="6.5"/><line class="mk-slash" x1="3.5" y1="12.5" x2="12.5" y2="3.5"/>',
  foiled: '<rect class="mk-ring" x="2" y="2" width="12" height="12" stroke-width="2.5"/>',
};

function markerKind(incident) {
  return incident.type === "Foiled plot" ? "foiled" : incident.status;
}

function markerSvg(kind) {
  return `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${MARKER_SVG[kind]}</svg>`;
}

const mapState = { map: null, markers: new Map(), selectedId: null };
let allIncidents = [];
const incidentsById = new Map();

function setUpMap(incidents) {
  const map = L.map("map", {
    zoomControl: false,
    scrollWheelZoom: false,
    zoomSnap: 0.5,
    minZoom: 3,
    maxZoom: 12,
    worldCopyJump: false,
  });
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  }).addTo(map);
  map.fitBounds(EUROPE_BOUNDS);

  // The map sits inside a scrolling page, so the mouse wheel only zooms
  // once someone has clicked or tabbed into the map.
  map.once("focus click", () => map.scrollWheelZoom.enable());

  document.getElementById("zoom-in").addEventListener("click", () => map.zoomIn());
  document.getElementById("zoom-out").addEventListener("click", () => map.zoomOut());
  document.getElementById("zoom-europe").addEventListener("click", () => map.fitBounds(EUROPE_BOUNDS));

  // Markers are created once; applyFilters() adds and removes them.
  for (const incident of incidents) {
    const label = incidentLabel(incident);
    const marker = L.marker([incident.lat, incident.lon], {
      icon: L.divIcon({
        className: "gz-marker",
        html: markerSvg(markerKind(incident)),
        iconSize: [36, 36],
      }),
      title: label,
      riseOnHover: true,
    });
    marker.on("click", () => navigateTo(incident.id));
    // Leaflet rebuilds the marker element each time it is added to the map.
    marker.on("add", () => {
      const el = marker.getElement();
      el.setAttribute("aria-label", label);
      el.classList.toggle("is-selected", mapState.selectedId === incident.id);
      // Leaflet gives markers role="button", so Enter and Space must work too.
      el.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigateTo(incident.id);
        }
      });
    });
    mapState.markers.set(incident.id, marker);
  }
  mapState.map = map;
}

function incidentLabel(incident) {
  return `${incident.place}, ${incident.country}: ${incident.title}. ` +
    (incident.type === "Foiled plot" ? "Foiled plot, " : "") + GRADE_NAMES[incident.status];
}

function markSelected(id) {
  if (mapState.selectedId) {
    mapState.markers.get(mapState.selectedId)?.getElement()?.classList.remove("is-selected");
  }
  mapState.selectedId = id;
  mapState.markers.get(id)?.getElement()?.classList.add("is-selected");
  for (const item of document.querySelectorAll(".incident-item")) {
    if (item.dataset.id === id) item.setAttribute("aria-current", "true");
    else item.removeAttribute("aria-current");
  }
  document.getElementById("map-hint").hidden = Boolean(id);
}

// Each incident has its own link, /#<id>. Selecting an incident adds it to the
// browser history, so Back returns to the list.
function navigateTo(id) {
  const base = `${location.pathname}${location.search}`;
  history.pushState(null, "", id ? `${base}#${id}` : base);
  route();
}

function route({ fromLink = false } = {}) {
  const id = decodeURIComponent(location.hash.slice(1));
  const incident = incidentsById.get(id);
  if (incident) {
    if (incident.id !== mapState.selectedId || document.getElementById("record").hidden) {
      openRecord(incident);
      if (fromLink) revealExplorer();
    }
  } else if (mapState.selectedId) {
    closeRecord();
  }
}

// A link from elsewhere on the page (such as Latest changes) scrolls the map back into view.
function revealExplorer() {
  const explorer = document.querySelector(".explorer");
  if (explorer.getBoundingClientRect().top < 0) explorer.scrollIntoView({ block: "start" });
}

function openRecord(incident) {
  markSelected(incident.id);
  applyFilters(allIncidents);
  const marker = mapState.markers.get(incident.id);
  if (marker) mapState.map.panInside(marker.getLatLng(), { padding: [60, 60] });

  renderRecord(incident);
  document.getElementById("list-view").hidden = true;
  document.getElementById("record").hidden = false;
  document.getElementById("rail").scrollTop = 0;
  document.getElementById("record-title").focus({ preventScroll: true });
}

function closeRecord() {
  const id = mapState.selectedId;
  markSelected(null);
  document.getElementById("record").hidden = true;
  document.getElementById("list-view").hidden = false;
  applyFilters(allIncidents);
  // Return keyboard focus to the entry that was open.
  const item = document.querySelector(`.incident-item[data-id="${CSS.escape(id)}"]`);
  if (item) {
    item.focus({ preventScroll: true });
    item.scrollIntoView({ block: "nearest" });
  }
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

function renderRecord(incident) {
  const withdrawn = incident.status === "withdrawn";
  document.getElementById("record-withdrawn").hidden = !withdrawn;
  setText("record-withdrawn-reason", withdrawn ? `${incident.history.at(-1).reason}.` : "");

  document.getElementById("record-marker").innerHTML = markerSvg(markerKind(incident));
  setText("record-grade", GRADE_NAMES[incident.status]);
  setText("record-title", incident.title);
  const where = document.getElementById("record-where");
  where.textContent = `${incident.place}, ${incident.country}. ${formatDate(incident.date)}.`;
  if (incident.locationPrecision === "approximate") {
    where.append(document.createElement("br"), "Location is approximate.");
  }

  setText("record-type", incident.type);
  setText("record-target", `${incident.targetCategory}: ${incident.target}`);
  setText("record-impact", incident.impact);
  setText("record-summary", incident.summary);
  setText("record-note", incident.note);

  document.getElementById("record-history").replaceChildren(...incident.history.map((h) => {
    const li = document.createElement("li");
    const time = document.createElement("time");
    time.dateTime = h.date;
    time.textContent = formatDate(h.date);
    const text = document.createElement("span");
    const grade = document.createElement("strong");
    grade.textContent = GRADE_NAMES[h.status];
    text.append(grade, `: ${h.reason}`);
    li.append(time, text);
    return li;
  }));

  document.getElementById("record-sources").replaceChildren(...incident.sources.map((source) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = source.url;
    link.textContent = source.label;
    li.append(link);
    return li;
  }));

  setText("record-checked", `Last checked ${formatDate(incident.lastChecked)}`);
  setText("copy-status", "");
}

async function copyLink() {
  const url = `${location.origin}${location.pathname}#${mapState.selectedId}`;
  try {
    await navigator.clipboard.writeText(url);
    setText("copy-status", "Link copied.");
  } catch {
    setText("copy-status", `Copy this link: ${url}`);
  }
}

function setUpRecord() {
  document.getElementById("back-button").addEventListener("click", () => navigateTo(null));
  document.getElementById("copy-link").addEventListener("click", copyLink);
  // Browsers fire one or both of these for Back, Forward and #links.
  window.addEventListener("popstate", () => route({ fromLink: true }));
  window.addEventListener("hashchange", () => route({ fromLink: true }));
}

// Filters. They live in the web address so a filtered view can be shared.

const ALL_GRADES = Object.keys(GRADE_NAMES);

const filters = {
  grades: new Set(ALL_GRADES),
  foiled: false,
  q: "",
  type: "",
  country: "",
  year: "",
};

function resetFilters() {
  filters.grades = new Set(ALL_GRADES);
  filters.foiled = false;
  filters.q = filters.type = filters.country = filters.year = "";
}

function readFiltersFromUrl() {
  const params = new URLSearchParams(location.search);
  if (params.has("grades")) {
    filters.grades = new Set(params.get("grades").split(",").filter((g) => ALL_GRADES.includes(g)));
  }
  filters.foiled = params.get("foiled") === "1";
  filters.q = params.get("q") || "";
  filters.type = params.get("type") || "";
  filters.country = params.get("country") || "";
  filters.year = params.get("year") || "";
}

function writeFiltersToUrl() {
  const params = new URLSearchParams();
  if (filters.grades.size !== ALL_GRADES.length) {
    params.set("grades", ALL_GRADES.filter((g) => filters.grades.has(g)).join(","));
  }
  if (filters.foiled) params.set("foiled", "1");
  for (const key of ["q", "type", "country", "year"]) {
    if (filters[key]) params.set(key, filters[key]);
  }
  const query = params.toString();
  history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
}

// Lower case without accents, so "lodz" finds Łódź and "tromso" finds Tromsø.
function fold(text) {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ø/g, "o").replace(/ł/g, "l");
}

function matches(incident, { ignoreGrade = false, ignoreFoiled = false } = {}) {
  const isFoiled = incident.type === "Foiled plot";
  if (isFoiled && !ignoreFoiled && !filters.foiled && filters.type !== "Foiled plot") return false;
  if (!ignoreGrade && !filters.grades.has(incident.status)) return false;
  if (filters.type && incident.type !== filters.type) return false;
  if (filters.country && incident.country !== filters.country) return false;
  if (filters.year && incident.date.slice(0, 4) !== filters.year) return false;
  if (filters.q) {
    const haystack = fold([incident.place, incident.country, incident.title, incident.type,
      incident.targetCategory, incident.target].join(" "));
    if (!fold(filters.q).split(/\s+/).every((word) => haystack.includes(word))) return false;
  }
  return true;
}

function fillSelect(id, values) {
  const select = document.getElementById(id);
  for (const value of values) select.add(new Option(value, value));
}

function syncControls() {
  for (const button of document.querySelectorAll(".grade-toggle")) {
    button.setAttribute("aria-pressed", String(filters.grades.has(button.dataset.grade)));
  }
  document.getElementById("foiled-toggle").setAttribute("aria-pressed", String(filters.foiled));
  document.getElementById("search").value = filters.q;
  document.getElementById("filter-type").value = filters.type;
  document.getElementById("filter-country").value = filters.country;
  document.getElementById("filter-year").value = filters.year;
}

function setUpFilters(incidents) {
  const unique = (key) => [...new Set(incidents.map(key))].sort();
  fillSelect("filter-type", unique((e) => e.type));
  fillSelect("filter-country", unique((e) => e.country));
  fillSelect("filter-year", unique((e) => e.date.slice(0, 4)).reverse());

  readFiltersFromUrl();
  syncControls();

  const moreButton = document.getElementById("more-filters-button");
  const morePanel = document.getElementById("more-filters");
  const setMoreOpen = (open) => {
    moreButton.setAttribute("aria-expanded", String(open));
    morePanel.hidden = !open;
  };
  setMoreOpen(Boolean(filters.type || filters.country || filters.year));
  moreButton.addEventListener("click", () => setMoreOpen(morePanel.hidden));

  const update = () => {
    writeFiltersToUrl();
    applyFilters(incidents);
  };

  for (const button of document.querySelectorAll(".grade-toggle")) {
    button.addEventListener("click", () => {
      const grade = button.dataset.grade;
      if (filters.grades.has(grade)) filters.grades.delete(grade);
      else filters.grades.add(grade);
      button.setAttribute("aria-pressed", String(filters.grades.has(grade)));
      update();
    });
  }
  document.getElementById("foiled-toggle").addEventListener("click", (event) => {
    filters.foiled = !filters.foiled;
    event.currentTarget.setAttribute("aria-pressed", String(filters.foiled));
    update();
  });
  document.getElementById("search").addEventListener("input", (event) => {
    filters.q = event.target.value.trim();
    update();
  });
  for (const key of ["type", "country", "year"]) {
    document.getElementById(`filter-${key}`).addEventListener("change", (event) => {
      filters[key] = event.target.value;
      update();
    });
  }
  document.getElementById("clear-filters").addEventListener("click", () => {
    resetFilters();
    syncControls();
    update();
    document.getElementById("search").focus();
  });

  applyFilters(incidents);
}

function applyFilters(incidents) {
  const shown = incidents.filter((e) => matches(e));
  const shownIds = new Set(shown.map((e) => e.id));

  for (const button of document.querySelectorAll(".grade-toggle")) {
    const count = incidents.filter((e) => e.status === button.dataset.grade && matches(e, { ignoreGrade: true })).length;
    button.querySelector(".grade-toggle-count").textContent = count;
  }
  document.getElementById("foiled-count").textContent =
    incidents.filter((e) => e.type === "Foiled plot" && matches(e, { ignoreFoiled: true })).length;

  // The open incident keeps its dot even if the filters would hide it.
  for (const [id, marker] of mapState.markers) {
    if (shownIds.has(id) || id === mapState.selectedId) marker.addTo(mapState.map);
    else marker.remove();
  }

  document.getElementById("result-count").textContent = `Showing ${shown.length} of ${incidents.length}`;
  document.getElementById("no-results").hidden = shown.length > 0;
  renderList(shown);
}

function renderList(shown) {
  const newestFirst = [...shown].sort((a, b) => b.date.localeCompare(a.date));
  const list = document.getElementById("incident-list");
  list.replaceChildren(...newestFirst.map((incident) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "incident-item";
    button.dataset.id = incident.id;
    if (incident.id === mapState.selectedId) button.setAttribute("aria-current", "true");
    button.innerHTML = `
      <span class="marker-icon">${markerSvg(markerKind(incident))}</span>
      <span class="incident-where"><span></span><time class="incident-date"></time></span>
      <span class="incident-title"></span>
      <span class="incident-type"></span>`;
    // Data goes in as text, never as HTML.
    button.querySelector(".incident-where span").textContent = `${incident.place}, ${incident.country}`;
    const time = button.querySelector("time");
    time.dateTime = incident.date;
    time.textContent = formatDate(incident.date);
    button.querySelector(".incident-title").textContent = incident.title;
    // The marker shows the grade; screen readers hear it as text.
    const grade = document.createElement("span");
    grade.className = "visually-hidden";
    grade.textContent = `. ${GRADE_NAMES[incident.status]}`;
    button.querySelector(".incident-type").append(incident.type, grade);
    button.addEventListener("click", () => navigateTo(incident.id));
    li.append(button);
    return li;
  }));
}

function showLegend() {
  for (const el of document.querySelectorAll("[data-marker]")) {
    el.innerHTML = markerSvg(el.dataset.marker);
  }
}

function setUpMenu() {
  const button = document.querySelector(".menu-button");
  const nav = document.getElementById("site-nav");
  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  });
}

function showTotals(incidents) {
  for (const dd of document.querySelectorAll("#totals dd")) {
    dd.textContent = incidents.filter((e) => e.status === dd.dataset.grade).length;
  }
  const updated = incidents.map((e) => e.lastChecked).sort().at(-1);
  document.getElementById("intro-summary").textContent =
    `${incidents.length} incidents since Feb 2022. Updated ${formatDate(updated)}.`;
}

// The most recent additions and regrades, taken from each entry's history.
function showLatestChanges(incidents, count = 5) {
  const rows = [];
  for (const e of incidents) {
    e.history.forEach((h, i) => rows.push({ incident: e, change: h, isFirst: i === 0 }));
  }
  rows.sort((a, b) => b.change.date.localeCompare(a.change.date));

  const list = document.getElementById("changes");
  list.replaceChildren(...rows.slice(0, count).map(({ incident, change, isFirst }) => {
    const li = document.createElement("li");
    const time = document.createElement("time");
    time.dateTime = change.date;
    time.textContent = formatDate(change.date);
    const link = document.createElement("a");
    link.href = `#${incident.id}`;
    link.textContent = `${incident.place}, ${incident.country}`;
    const verb = isFirst ? "added as" : "regraded to";
    li.append(time, link, `: ${verb} ${GRADE_NAMES[change.status].toLowerCase()}.`);
    return li;
  }));
}

async function main() {
  setUpMenu();
  showLegend();
  try {
    const response = await fetch("data/incidents.json");
    if (!response.ok) throw new Error(response.statusText);
    const incidents = await response.json();
    allIncidents = incidents;
    for (const incident of incidents) incidentsById.set(incident.id, incident);
    showTotals(incidents);
    setUpMap(incidents);
    setUpFilters(incidents);
    setUpRecord();
    route();
    showLatestChanges(incidents);
  } catch (err) {
    document.getElementById("intro-summary").textContent = "The incident data could not be loaded.";
    console.error(err);
  }
}

main();
