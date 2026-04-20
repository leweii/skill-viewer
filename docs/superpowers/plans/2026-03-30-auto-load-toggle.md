# Auto-Load Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `autoLoad` toggle that prevents the extension from running on page load by default, activating only when the toolbar icon is clicked; also expose this toggle as a button in the sidebar.

**Architecture:** A new boolean `autoLoad` (default `false`) in `chrome.storage.local` gates `content.js` initialization. When `false`, the content script exits early and listens for an `ACTIVATE` message from `background.js`. The sidebar header gets a small toggle button that only writes to storage.

**Tech Stack:** Vanilla JavaScript, Chrome Extensions MV3, `chrome.storage.local`, `chrome.runtime.onMessage`

---

### Task 1: Add `autoLoad` to options page

**Files:**
- Modify: `extension/options.html` (line ~568)
- Modify: `extension/options.js` (lines ~361, ~530, ~549, ~576, ~593, ~697)

- [ ] **Step 1: Add i18n strings for `autoLoad` in options.js**

Find each language block (there are 8) and add an `autoLoad` entry after the existing `autoOpen` entry. The blocks start at line ~361. Each one looks like:

```javascript
"autoOpen": "Auto-open sidebar when skills are found",
```

Add after each:
```javascript
"autoOpen": "Auto-open sidebar when skills are found",
"autoLoad": "Auto-scan for skills when opening a page",
```

For the other 7 languages, add the same English fallback for now (same string as English is fine — this is internal tooling and translations can follow):
```javascript
"autoLoad": "Auto-scan for skills when opening a page",
```

- [ ] **Step 2: Wire the label translation in options.js**

Find the `applyTranslations()` or equivalent block that sets label text (around line 530):
```javascript
document.getElementById('label-auto-open').textContent = t('autoOpen');
```
Add after it:
```javascript
document.getElementById('label-auto-load').textContent = t('autoLoad');
```

- [ ] **Step 3: Add `autoLoad` to the storage keys fetched on load**

Find the array passed to `chrome.storage.local.get` around line 549:
```javascript
'autoOpen',
```
Add `'autoLoad'` to the same array:
```javascript
'autoOpen',
'autoLoad',
```

- [ ] **Step 4: Set initial checkbox value from storage**

Find where `autoOpen` checkbox is set (around line 576):
```javascript
document.getElementById('auto-open').checked = settings.autoOpen !== false;
```
Add after it:
```javascript
document.getElementById('auto-load').checked = settings.autoLoad === true;
```
(default is `false`, so we check `=== true` not `!== false`)

- [ ] **Step 5: Bind change listener**

Find where `auto-open` change listener is registered (around line 593):
```javascript
document.getElementById('auto-open').addEventListener('change', saveCheckboxes);
```
Add:
```javascript
document.getElementById('auto-load').addEventListener('change', saveCheckboxes);
```

- [ ] **Step 6: Include `autoLoad` in the save function**

Find `saveCheckboxes` (around line 697) where `autoOpen` is read:
```javascript
const autoOpen = document.getElementById('auto-open').checked;
```
Add:
```javascript
const autoLoad = document.getElementById('auto-load').checked;
```

Find the `chrome.storage.local.set` call and add `autoLoad`:
```javascript
await chrome.storage.local.set({ autoOpen, darkMode, defaultPlatform, autoLoad });
```

- [ ] **Step 7: Add checkbox HTML to options.html**

Find the `auto-open` checkbox block (around line 568):
```html
<div class="checkbox-item">
  <input type="checkbox" id="auto-open" checked>
  <label for="auto-open" id="label-auto-open">Auto-open sidebar when skills are found</label>
</div>
```
Add after it:
```html
<div class="checkbox-item">
  <input type="checkbox" id="auto-load">
  <label for="auto-load" id="label-auto-load">Auto-scan for skills when opening a page</label>
</div>
```

- [ ] **Step 8: Commit**

```bash
git add extension/options.html extension/options.js
git commit -m "feat: add autoLoad setting to options page"
```

---

### Task 2: Gate content.js initialization on `autoLoad`

**Files:**
- Modify: `extension/content.js` (lines ~3–32, ~474–480)

- [ ] **Step 1: Replace the immediate `init()` call with a storage-gated version**

Replace the current startup block (lines 13–14):
```javascript
// Initialize
init();
```

With:
```javascript
// Register ACTIVATE listener before anything else
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ACTIVATE') {
    if (window.__skillViewerInitialized) {
      // Already initialized — just toggle sidebar visibility
      if (sidebarEl) {
        sidebarEl.classList.toggle('hidden');
      }
    } else {
      init();
    }
    sendResponse({ success: true });
  }
  if (request.type === 'TOGGLE_SIDEBAR') {
    if (sidebarEl) {
      sidebarEl.classList.toggle('hidden');
    }
    sendResponse({ success: true, visible: sidebarEl && !sidebarEl.classList.contains('hidden') });
  }
  return true;
});

// Initialize only if autoLoad is enabled
chrome.storage.local.get(['autoLoad'], (settings) => {
  if (settings.autoLoad === true) {
    init();
  }
});
```

- [ ] **Step 2: Mark initialization complete inside `init()`**

In the `init()` function, add at the top:
```javascript
function init() {
  window.__skillViewerInitialized = true;
  // ... rest of existing init code
```

- [ ] **Step 3: Remove the old `TOGGLE_SIDEBAR` message listener**

Remove the existing listener block (around lines 474–480):
```javascript
// Listen for toggle message from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TOGGLE_SIDEBAR') {
    toggleSidebar();
    sendResponse({ success: true, visible: sidebarEl && !sidebarEl.classList.contains('hidden') });
  }
  return true;
});
```
This is now handled in the combined listener added in Step 1.

- [ ] **Step 4: Commit**

```bash
git add extension/content.js
git commit -m "feat: gate content.js init on autoLoad setting, add ACTIVATE message handler"
```

---

### Task 3: Update background.js icon click to send `ACTIVATE`

**Files:**
- Modify: `extension/background.js` (lines ~391–401)

- [ ] **Step 1: Change `TOGGLE_SIDEBAR` to `ACTIVATE` in the icon click handler**

Find the current handler (lines 390–401):
```javascript
// Handle extension icon click - toggle sidebar on GitHub pages
chrome.action.onClicked.addListener((tab) => {
  // Only toggle on GitHub pages
  if (tab.url && tab.url.includes('github.com')) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' }).catch(() => {
      // Content script not loaded, open options instead
      chrome.runtime.openOptionsPage();
    });
  } else {
    chrome.runtime.openOptionsPage();
  }
});
```

Replace with:
```javascript
// Handle extension icon click - activate or toggle sidebar on GitHub pages
chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.includes('github.com')) {
    chrome.tabs.sendMessage(tab.id, { type: 'ACTIVATE' }).catch(() => {
      chrome.runtime.openOptionsPage();
    });
  } else {
    chrome.runtime.openOptionsPage();
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add extension/background.js
git commit -m "feat: send ACTIVATE instead of TOGGLE_SIDEBAR on icon click"
```

---

### Task 4: Add auto-load toggle button to the sidebar

**Files:**
- Modify: `extension/content.js` — `showSidebar()` function (lines ~386–423)
- Modify: `extension/sidebar.css`

- [ ] **Step 1: Add the button to the sidebar header HTML**

In `showSidebar()`, find the header HTML:
```javascript
sidebarEl.innerHTML = `
  <div class="sv-resize-handle"></div>
  <div class="sv-header">
    <h2>AI Skills</h2>
    <button class="sv-close-btn" title="Close">✕</button>
  </div>
```

Replace with:
```javascript
sidebarEl.innerHTML = `
  <div class="sv-resize-handle"></div>
  <div class="sv-header">
    <h2>AI Skills</h2>
    <div class="sv-header-actions">
      <button class="sv-autoload-btn" title="Auto-load">⚡</button>
      <button class="sv-close-btn" title="Close">✕</button>
    </div>
  </div>
```

- [ ] **Step 2: Bind the auto-load button after sidebar creation**

After the existing close button binding in `showSidebar()`:
```javascript
sidebarEl.querySelector('.sv-close-btn').addEventListener('click', () => {
  sidebarEl.classList.add('hidden');
});
```

Add:
```javascript
// Load and reflect current autoLoad state
const autoloadBtn = sidebarEl.querySelector('.sv-autoload-btn');
chrome.storage.local.get(['autoLoad'], (settings) => {
  if (settings.autoLoad === true) autoloadBtn.classList.add('active');
});

// Toggle autoLoad flag only — no other side effects
autoloadBtn.addEventListener('click', () => {
  chrome.storage.local.get(['autoLoad'], (settings) => {
    const next = !(settings.autoLoad === true);
    chrome.storage.local.set({ autoLoad: next });
    autoloadBtn.classList.toggle('active', next);
  });
});
```

- [ ] **Step 3: Add CSS for the header actions and button state**

In `extension/sidebar.css`, find the `.sv-close-btn` style and add alongside it:

```css
.sv-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sv-autoload-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 5px;
  border-radius: 4px;
  opacity: 0.4;
  transition: opacity 0.15s;
  line-height: 1;
}

.sv-autoload-btn:hover {
  opacity: 0.7;
}

.sv-autoload-btn.active {
  opacity: 1;
}

.dark .sv-autoload-btn {
  color: #fff;
}
```

- [ ] **Step 4: Commit**

```bash
git add extension/content.js extension/sidebar.css
git commit -m "feat: add auto-load toggle button to sidebar header"
```
