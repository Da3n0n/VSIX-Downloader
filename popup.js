document.addEventListener('DOMContentLoaded', async () => {
  const previewEl = document.getElementById('extensionInfo');
  const downloadBtn = document.getElementById('downloadBtn');
  const versionSelect = document.getElementById('versionSelect');
  
  let currentPublisher, currentExtension;

  try {
    console.log('Popup script started');
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Current tab:', tab);

    if (!tab) {
      throw new Error('No active tab found');
    }

    if (!tab.url.includes('marketplace.visualstudio.com')) {
      throw new Error('Please navigate to a VS Code extension page on marketplace.visualstudio.com');
    }

    const url = new URL(tab.url);
    const itemName = url.searchParams.get('itemName');
    
    if (!itemName) {
      throw new Error('No extension found. Please open a VS Code extension page.');
    }

    console.log('Found itemName:', itemName);
    
    const [publisher, extension] = itemName.split('.');
    currentPublisher = publisher;
    currentExtension = extension;

    if (!publisher || !extension) {
      throw new Error('Invalid extension format in URL.');
    }

    // Inject content script and get versions
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    const results = await chrome.tabs.sendMessage(tab.id, { action: "getVersion" });
    console.log('Received results:', results);

    if (!results || results.error) {
      throw new Error(results?.error || 'Failed to get version information');
    }

    const versions = results.versions;
    
    // Display preview
    previewEl.innerHTML = `
      Publisher: ${publisher}<br>
      Extension: ${extension}<br>
      Available Versions: ${versions.length}
    `;

    // Populate version select
    const versionList = document.getElementById('versionList');
    let selectedVersion = null;

    versionList.innerHTML = '';
    versions.forEach(version => {
      const btn = document.createElement('button');
      btn.className = 'version-btn';
      btn.textContent = version;
      btn.onclick = () => {
        Array.from(versionList.children).forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedVersion = version;
        downloadBtn.disabled = false;
      };
      versionList.appendChild(btn);
    });
    downloadBtn.disabled = true;

    // Download handler
    downloadBtn.addEventListener('click', async () => {
      const version = selectedVersion;
      if (!version) return;

      try {
        const downloadUrl = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extension}/${version}/vspackage`;
        console.log('Download URL:', downloadUrl);
        
        const response = await fetch(downloadUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/octet-stream;api-version=7.0-preview.1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        if (!response.ok) {
          throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        chrome.downloads.download({
          url: blobUrl,
          filename: `${currentPublisher}.${currentExtension}-${version}.vsix`,
          saveAs: true
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error('Download failed:', chrome.runtime.lastError);
            previewEl.innerHTML += '<br>Download failed. Please try again.';
          }
          window.URL.revokeObjectURL(blobUrl);
        });

      } catch (error) {
        console.error('Download error:', error);
        previewEl.innerHTML += `<br>Download failed: ${error.message}`;
      }
    });

  } catch (error) {
    console.error('Error:', error);
    previewEl.innerHTML = `Error: ${error.message}<br>Please check the console for more details.`;
    downloadBtn.disabled = true;
  }
});


