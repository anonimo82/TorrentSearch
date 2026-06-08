const hostInput   = document.getElementById("hostInput");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveBtn     = document.getElementById("saveBtn");
const statusEl    = document.getElementById("status");

function setStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = type || "";
}

async function tryJackett(baseUrl, apiKey) {
  const params = new URLSearchParams({ Query: "test" });
  if (apiKey) params.append("apikey", apiKey);
  const url = `${baseUrl}/api/v2.0/indexers/all/results?${params}`;
  const resp = await fetch(url, {
    headers: { "Accept": "application/json", ...(apiKey ? { "X-Api-Key": apiKey } : {}) }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if (typeof data.Results === "undefined") throw new Error("not Jackett");
  return true;
}

async function tryProwlarr(baseUrl, apiKey) {
  const params = new URLSearchParams({ query: "test" });
  if (apiKey) params.append("apikey", apiKey);
  const url = `${baseUrl}/api/v1/search?${params}`;
  const resp = await fetch(url, {
    headers: { "Accept": "application/json", ...(apiKey ? { "X-Api-Key": apiKey } : {}) }
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if (!Array.isArray(data)) throw new Error("not Prowlarr");
  return true;
}

browser.storage.local.get(["host", "apiKey"]).then(s => {
  hostInput.value = s.host || "http://127.0.0.1:9117";
  if (s.apiKey) apiKeyInput.value = s.apiKey;
});

saveBtn.addEventListener("click", async () => {
  const host   = hostInput.value.trim().replace(/\/$/, "");
  const apiKey = apiKeyInput.value.trim();

  if (!host) {
    setStatus("Enter URL.", "err");
    return;
  }

  setStatus("Detecting…", "info");
  saveBtn.disabled = true;

  let backend = null;

  try {
    await tryJackett(host, apiKey);
    backend = "jackett";
  } catch (_) {}

  if (!backend) {
    try {
      await tryProwlarr(host, apiKey);
      backend = "prowlarr";
    } catch (_) {}
  }

  saveBtn.disabled = false;

  if (!backend) {
    setStatus("Could not connect to Jackett or Prowlarr.", "err");
    return;
  }

  await browser.storage.local.set({ host, apiKey, backend });
  const label = backend === "jackett" ? "Jackett" : "Prowlarr";
  setStatus(`${label} connected ✓`, "ok");
  setTimeout(() => setStatus(""), 3000);
});
