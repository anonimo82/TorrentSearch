browser.contextMenus.create({
  id: "torrent-search",
  title: "Torrent Search",
  contexts: ["selection"]
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "torrent-search") return;

  const selectedText = info.selectionText.trim();
  if (!selectedText) return;

  const settings = await browser.storage.local.get(["host", "apiKey", "backend"]);
  const { host, apiKey, backend } = settings;

  if (!host || !backend) {
    browser.tabs.sendMessage(tab.id, {
      action: "showError",
      message: "Server not configured. Check extension settings."
    });
    return;
  }

  browser.tabs.sendMessage(tab.id, { action: "startSearch", query: selectedText });

  try {
    let url;
    const baseUrl = host.replace(/\/$/, "");
    const headers = { "Accept": "application/json", ...(apiKey ? { "X-Api-Key": apiKey } : {}) };

    if (backend === "jackett") {
      const params = new URLSearchParams({ Query: selectedText });
      if (apiKey) params.append("apikey", apiKey);
      url = `${baseUrl}/api/v2.0/indexers/all/results?${params}`;
    } else {
      const params = new URLSearchParams({ query: selectedText });
      if (apiKey) params.append("apikey", apiKey);
      url = `${baseUrl}/api/v1/search?${params}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const data = await response.json();

    let results;
    if (backend === "jackett") {
      results = data.Results || [];
    } else {
      results = (Array.isArray(data) ? data : []).map(r => ({
        Tracker:      r.indexer       || "",
        Title:        r.title         || "",
        CategoryDesc: (r.categories && r.categories[0] && r.categories[0].name) || "",
        Size:         r.size          || 0,
        Seeders:      r.seeders       || 0,
        Peers:        r.leechers      || 0,
        PublishDate:  r.publishDate   || null,
        Details:      r.infoUrl       || r.guid || "",
        Link:         r.downloadUrl   || "",
        MagnetUri:    r.magnetUrl     || ""
      }));
    }

    browser.tabs.sendMessage(tab.id, { action: "showResults", query: selectedText, results });

  } catch (err) {
    browser.tabs.sendMessage(tab.id, {
      action: "showError",
      message: `Connection error: ${err.message}`
    });
  }
});
