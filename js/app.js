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
  try {
    const response = await fetch("data/incidents.json");
    if (!response.ok) throw new Error(response.statusText);
    const incidents = await response.json();
    showTotals(incidents);
    showLatestChanges(incidents);
  } catch (err) {
    document.getElementById("intro-summary").textContent = "The incident data could not be loaded.";
    console.error(err);
  }
}

main();
