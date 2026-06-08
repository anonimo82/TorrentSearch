

let overlayEl = null;
let sortState = { col: null, dir: 1 };
let currentResults = [];

browser.runtime.onMessage.addListener((msg) => {
  if (msg.action === "startSearch") {
    showOverlay(msg.query, null, true);
  } else if (msg.action === "showResults") {
    showOverlay(msg.query, msg.results, false);
  } else if (msg.action === "showError") {
    showOverlay(null, null, false, msg.message);
  }
});

function showOverlay(query, results, loading, error) {
  removeOverlay();

  const overlay = document.createElement("div");
  overlay.id = "jacket-overlay-root";

  
  const backdrop = document.createElement("div");
  backdrop.className = "jacket-backdrop";
  backdrop.addEventListener("click", removeOverlay);

  
  const panel = document.createElement("div");
  panel.className = "jacket-panel";

  
  const header = document.createElement("div");
  header.className = "jacket-header";

  const title = document.createElement("div");
  title.className = "jacket-title";
  title.textContent = query ? `Torrent Search: "${query}"` : "Torrent Search";

  const closeBtn = document.createElement("button");
  closeBtn.className = "jacket-close";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", removeOverlay);

  header.appendChild(title);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  
  const body = document.createElement("div");
  body.className = "jacket-body";

  if (loading) {
    const loader = document.createElement("div");
    loader.className = "jacket-loader";
    loader.innerHTML = `<div class="jacket-spinner"></div><span>Searching…</span>`;
    body.appendChild(loader);
  } else if (error) {
    const errEl = document.createElement("div");
    errEl.className = "jacket-error";
    errEl.textContent = error;
    body.appendChild(errEl);
  } else if (results && results.length === 0) {
    const empty = document.createElement("div");
    empty.className = "jacket-empty";
    empty.textContent = "No results found.";
    body.appendChild(empty);
  } else if (results) {
    currentResults = results;
    sortState = { col: null, dir: 1 };
    body.appendChild(buildTable(results));
  }

  panel.appendChild(body);

  
  if (results && results.length > 0) {
    const footer = document.createElement("div");
    footer.className = "jacket-footer";
    footer.textContent = `${results.length} results`;
    panel.appendChild(footer);
  }

  overlay.appendChild(backdrop);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  overlayEl = overlay;

  
  document.addEventListener("keydown", escListener);
}

function escListener(e) {
  if (e.key === "Escape") removeOverlay();
}

function removeOverlay() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
  document.removeEventListener("keydown", escListener);
}

function buildTable(data) {
  const columns = [
    { key: "Tracker",      label: "Tracker",   type: "text", sortable: true  },
    { key: "Title",        label: "Title",     type: "link", sortable: true  },
    { key: "CategoryDesc", label: "Category",  type: "text", sortable: true  },
    { key: "Size",         label: "Size",      type: "size", sortable: true  },
    { key: "Seeders",      label: "S",         type: "num",  sortable: true  },
    { key: "Peers",        label: "P",         type: "num",  sortable: true  },
    { key: "PublishDate",  label: "Date",      type: "date", sortable: true  },
    { key: "_links",       label: "Links",     type: "links",sortable: false }
  ];

  const wrapper = document.createElement("div");
  wrapper.className = "jacket-table-wrapper";

  const table = document.createElement("table");
  table.className = "jacket-table";

  
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  columns.forEach(col => {
    const th = document.createElement("th");
    th.dataset.col = col.key;
    th.className = "jacket-th";
    if (!col.sortable) th.classList.add("jacket-th-nosort");

    const inner = document.createElement("span");
    inner.textContent = col.label;

    th.appendChild(inner);

    if (col.sortable) {
      const arrow = document.createElement("span");
      arrow.className = "jacket-sort-arrow";
      arrow.textContent = " ↕";
      th.appendChild(arrow);
      th.addEventListener("click", () => sortBy(col.key, col.type, table, columns));
    }
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  tbody.id = "jacket-tbody";
  renderRows(tbody, data, columns);
  table.appendChild(tbody);

  wrapper.appendChild(table);
  return wrapper;
}

function renderRows(tbody, data, columns) {
  tbody.innerHTML = "";
  data.forEach(item => {
    const tr = document.createElement("tr");
    tr.className = "jacket-tr";

    columns.forEach(col => {
      const td = document.createElement("td");
      td.className = "jacket-td";
      const val = item[col.key];

      if (col.type === "link") {
        
        const detailsUrl = item.Details || item.Guid;
        if (detailsUrl) {
          const a = document.createElement("a");
          a.href = detailsUrl;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.className = "jacket-link";
          a.textContent = val || "—";
          td.appendChild(a);
        } else {
          td.textContent = val || "—";
        }
      } else if (col.type === "links") {
        td.className += " jacket-td-links";
        const downloadUrl = item.Link;
        const magnetUrl   = item.MagnetUri;

        if (downloadUrl) {
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.className = "jacket-icon-link";
          a.title = "Download .torrent";
          a.textContent = "📥";
          td.appendChild(a);
        }
        if (magnetUrl) {
          const a = document.createElement("a");
          a.href = magnetUrl;
          a.className = "jacket-icon-link jacket-icon-magnet";
          a.title = "Magnet link";
          a.textContent = "🧲";
          td.appendChild(a);
        }
        if (!downloadUrl && !magnetUrl) {
          td.textContent = "—";
          td.style.color = "#4b5563";
        }
      } else if (col.type === "size") {
        td.textContent = formatSize(val);
      } else if (col.type === "date") {
        td.textContent = val ? new Date(val).toLocaleDateString("en-GB") : "—";
      } else if (col.type === "num") {
        td.textContent = val != null ? val : "—";
        td.style.textAlign = "center";
        if (col.key === "Seeders" && val > 0) td.style.color = "#4ade80";
        if (col.key === "Peers" && val > 0) td.style.color = "#fb923c";
      } else {
        td.textContent = val || "—";
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function sortBy(colKey, colType, table, columns) {
  if (sortState.col === colKey) {
    sortState.dir *= -1;
  } else {
    sortState.col = colKey;
    sortState.dir = 1;
  }

  
  table.querySelectorAll(".jacket-th").forEach(th => {
    const arrow = th.querySelector(".jacket-sort-arrow");
    if (!arrow) return;
    if (th.dataset.col === colKey) {
      arrow.textContent = sortState.dir === 1 ? " ↑" : " ↓";
      th.classList.add("jacket-th-active");
    } else {
      arrow.textContent = " ↕";
      th.classList.remove("jacket-th-active");
    }
  });

  const sorted = [...currentResults].sort((a, b) => {
    let va = a[colKey], vb = b[colKey];
    if (colType === "num" || colType === "size") {
      va = parseFloat(va) || 0;
      vb = parseFloat(vb) || 0;
    } else if (colType === "date") {
      va = va ? new Date(va).getTime() : 0;
      vb = vb ? new Date(vb).getTime() : 0;
    } else {
      va = (va || "").toString().toLowerCase();
      vb = (vb || "").toString().toLowerCase();
    }
    if (va < vb) return -1 * sortState.dir;
    if (va > vb) return 1 * sortState.dir;
    return 0;
  });

  const tbody = table.querySelector("#jacket-tbody");
  renderRows(tbody, sorted, columns);
}

function formatSize(bytes) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let val = parseFloat(bytes);
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}
