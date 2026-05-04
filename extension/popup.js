const STASH_URL = 'http://localhost:3847';

let currentTab = null;

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // Show URL
  const urlText = document.getElementById('url-text');
  try {
    const u = new URL(tab.url);
    urlText.textContent = u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '') || u.hostname;
  } catch {
    urlText.textContent = tab.url;
  }

  // Show title
  const titleEl = document.getElementById('page-title');
  titleEl.textContent = tab.title || '';

  // Show favicon
  const favicon = document.getElementById('favicon');
  const placeholder = document.getElementById('favicon-placeholder');
  if (tab.favIconUrl) {
    favicon.src = tab.favIconUrl;
    favicon.style.display = 'block';
    placeholder.style.display = 'none';
    favicon.onerror = () => {
      favicon.style.display = 'none';
      placeholder.style.display = 'block';
    };
  }

  // Focus note field
  document.getElementById('note').focus();
}

document.getElementById('save-btn').addEventListener('click', async () => {
  if (!currentTab) return;

  const btn = document.getElementById('save-btn');
  const status = document.getElementById('status');
  const note = document.getElementById('note').value.trim();

  btn.disabled = true;
  btn.textContent = 'Saving…';
  status.textContent = '';
  status.className = 'status';

  try {
    const res = await fetch(`${STASH_URL}/api/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: currentTab.url,
        title: currentTab.title,
        note: note || null,
      }),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Server error');

    if (data.duplicate) {
      status.textContent = 'Already in Stash';
      status.className = 'status duplicate';
      btn.textContent = 'Already saved';
    } else {
      status.textContent = 'Saved!';
      status.className = 'status success';
      btn.textContent = 'Saved';
      setTimeout(() => window.close(), 800);
    }
  } catch (err) {
    status.textContent = err.message.includes('fetch') ? 'Stash server not running' : err.message;
    status.className = 'status error';
    btn.disabled = false;
    btn.textContent = 'Save to Stash';
  }
});

// Save on Cmd+Enter / Ctrl+Enter
document.getElementById('note').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    document.getElementById('save-btn').click();
  }
});

init();
