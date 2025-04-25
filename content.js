// Log when content script loads
console.log('VSCode Extension Downloader content script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getVersion") {
    let versions = [];

    // 1. Try Version History tab (table cells)
    document.querySelectorAll('td, th').forEach(td => {
      const text = td.textContent.trim();
      if (/^\d+\.\d+\.\d+(-[\w\d.]+)?$/.test(text) && !/^\d{4}\.\d{2}\.\d{2}$/.test(text)) {
        versions.push(text);
      }
    });

    // 2. Try Release Notes section (look for version numbers, skip dates)
    if (versions.length === 0) {
      document.querySelectorAll('*').forEach(el => {
        const text = el.textContent.trim();
        if (/^\d+\.\d+\.\d+(-[\w\d.]+)?$/.test(text) && !/^\d{4}\.\d{2}\.\d{2}$/.test(text)) {
          versions.push(text);
        }
      });
    }

    // 3. Try main version display (top of page)
    if (versions.length === 0) {
      const mainVersion = document.querySelector('.version, [data-testid="version-display"]');
      if (mainVersion) {
        const text = mainVersion.textContent.trim();
        const match = text.match(/\d+\.\d+\.\d+(-[\w\d.]+)?/);
        if (match) versions.push(match[0]);
      }
    }

    // Remove duplicates and sort (descending)
    versions = [...new Set(versions)];
    versions = versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

    if (versions.length === 0) {
      sendResponse({ error: 'Could not find any version information' });
    } else {
      sendResponse({ versions });
    }
    return true;
  }
  return true;
});





