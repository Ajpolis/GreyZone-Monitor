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

  for (const incident of incidents) {
    const label = `${incident.place}, ${incident.country}: ${incident.title}. ` +
      (incident.type === "Foiled plot" ? "Foiled plot, " : "") + GRADE_NAMES[incident.status];
    const marker = L.marker([incident.lat, incident.lon], {
      icon: L.divIcon({
        className: "gz-marker",
        html: markerSvg(markerKind(incident)),
        iconSize: [36, 36],
      }),
      title: label,
      riseOnHover: true,
    }).addTo(map);
    const el = marker.getElement();
    el.setAttribute("aria-label", label);
    marker.on("click", () => selectIncident(incident.id));
    // Leaflet gives markers role="button", so Enter and Space must work too.
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectIncident(incident.id);
      }
    });
    mapState.markers.set(incident.id, marker);
  }
  mapState.map = map;
}

// Step 5 opens the record here; for now selection only marks the dot.
function selectIncident(id) {
  if (mapState.selectedId) {
    mapState.markers.get(mapState.selectedId)?.getElement()?.classList.remove("is-selected");
  }
  mapState.selectedId = id;
  mapState.markers.get(id)?.getElement()?.classList.add("is-selected");
  document.getElementById("map-hint").hidden = Boolean(id);
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
    showTotals(incidents);
    setUpMap(incidents);
    showLatestChanges(incidents);
  } catch (err) {
    document.getElementById("intro-summary").textContent = "The incident data could not be loaded.";
    console.error(err);
  }
}

main();
