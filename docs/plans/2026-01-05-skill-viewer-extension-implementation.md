# Skill Viewer Chrome Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome extension that auto-detects Claude skills on GitHub and shows AI summaries in a sidebar.

**Architecture:** Manifest V3 extension with content script (GitHub injection), service worker (API calls), and options page (settings). Content script detects skills via GitHub API, sends to background for Gemini summarization, renders results in injected sidebar.

**Tech Stack:** Chrome Extension Manifest V3, Vanilla JavaScript, Gemini 2.0 Flash API, chrome.storage API

---

## Task 1: Extension Scaffold & Manifest

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/icons/icon16.png`
- Create: `extension/icons/icon48.png`
- Create: `extension/icons/icon128.png`

**Step 1: Create directory structure**

Run:
```bash
mkdir -p extension/icons extension/lib
```

**Step 2: Create manifest.json**

Create `extension/manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "Skill Viewer",
  "version": "1.0.0",
  "description": "View Claude Code skills on GitHub with AI-powered summaries",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://github.com/*",
    "https://api.github.com/*",
    "https://raw.githubusercontent.com/*",
    "https://generativelanguage.googleapis.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://github.com/*/*"],
      "js": ["content.js"],
      "css": ["sidebar.css"],
      "run_at": "document_idle"
    }
  ],
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    },
    "default_title": "Skill Viewer"
  }
}
```

**Step 3: Create placeholder icons**

Create simple SVG icons and convert to PNG. For now, create placeholder files:

Run:
```bash
# Create simple colored square icons as placeholders
# We'll use a base64-encoded 1x1 blue pixel PNG expanded
cat > extension/icons/icon16.png << 'PNGEOF'
PNG placeholder - replace with actual icon
PNGEOF

cat > extension/icons/icon48.png << 'PNGEOF'
PNG placeholder - replace with actual icon
PNGEOF

cat > extension/icons/icon128.png << 'PNGEOF'
PNG placeholder - replace with actual icon
PNGEOF
```

Note: Replace these with actual PNG icons before publishing. For development, Chrome will show a default icon.

**Step 4: Create empty required files**

Run:
```bash
touch extension/background.js extension/content.js extension/sidebar.css extension/options.html extension/options.js
```

**Step 5: Verify structure**

Run:
```bash
ls -la extension/ && ls extension/icons/
```
Expected: All files listed

**Step 6: Commit scaffold**

Run:
```bash
git add -A && git commit -m "feat: add extension scaffold with manifest v3"
```

---

## Task 2: Sidebar CSS

**Files:**
- Create: `extension/sidebar.css`

**Step 1: Write sidebar styles**

Create `extension/sidebar.css`:
```css
/* Skill Viewer Sidebar Styles */

#skill-viewer-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 350px;
  height: 100vh;
  background: #ffffff;
  border-left: 1px solid #d0d7de;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 999999;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 14px;
  color: #24292f;
  transform: translateX(0);
  transition: transform 0.3s ease;
}

#skill-viewer-sidebar.hidden {
  transform: translateX(100%);
}

/* Dark mode */
#skill-viewer-sidebar.dark {
  background: #0d1117;
  border-left-color: #30363d;
  color: #c9d1d9;
}

/* Header */
.sv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #d0d7de;
  background: #f6f8fa;
}

.dark .sv-header {
  background: #161b22;
  border-bottom-color: #30363d;
}

.sv-header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.sv-close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #57606a;
  padding: 4px 8px;
  border-radius: 4px;
}

.sv-close-btn:hover {
  background: #d0d7de;
}

.dark .sv-close-btn {
  color: #8b949e;
}

.dark .sv-close-btn:hover {
  background: #30363d;
}

/* Content area */
.sv-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

/* Loading state */
.sv-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #57606a;
}

.dark .sv-loading {
  color: #8b949e;
}

.sv-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #d0d7de;
  border-top-color: #0969da;
  border-radius: 50%;
  animation: sv-spin 0.8s linear infinite;
  margin-right: 10px;
}

.dark .sv-spinner {
  border-color: #30363d;
  border-top-color: #58a6ff;
}

@keyframes sv-spin {
  to { transform: rotate(360deg); }
}

/* Empty state */
.sv-empty {
  text-align: center;
  padding: 40px 20px;
  color: #57606a;
}

.dark .sv-empty {
  color: #8b949e;
}

/* Skill item */
.sv-skill {
  margin-bottom: 8px;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  overflow: hidden;
}

.dark .sv-skill {
  border-color: #30363d;
}

.sv-skill-header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  background: #f6f8fa;
  font-weight: 500;
}

.sv-skill-header:hover {
  background: #eaeef2;
}

.dark .sv-skill-header {
  background: #161b22;
}

.dark .sv-skill-header:hover {
  background: #21262d;
}

.sv-chevron {
  margin-right: 8px;
  font-size: 10px;
  transition: transform 0.2s;
}

.sv-skill.collapsed .sv-chevron {
  transform: rotate(-90deg);
}

.sv-skill-name {
  flex: 1;
}

.sv-skill-body {
  padding: 12px;
  border-top: 1px solid #d0d7de;
  background: #ffffff;
}

.dark .sv-skill-body {
  border-top-color: #30363d;
  background: #0d1117;
}

.sv-skill.collapsed .sv-skill-body {
  display: none;
}

/* Summary text */
.sv-summary {
  line-height: 1.5;
  margin-bottom: 12px;
}

/* Raw content (markdown) */
.sv-raw-content {
  font-size: 13px;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  background: #f6f8fa;
  border-radius: 4px;
  margin-bottom: 12px;
}

.dark .sv-raw-content {
  background: #161b22;
}

.sv-raw-content h1,
.sv-raw-content h2,
.sv-raw-content h3 {
  font-size: 14px;
  margin: 8px 0 4px 0;
}

.sv-raw-content p {
  margin: 4px 0;
}

.sv-raw-content code {
  background: #eaeef2;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 12px;
}

.dark .sv-raw-content code {
  background: #30363d;
}

/* View link */
.sv-view-link {
  display: inline-block;
  color: #0969da;
  text-decoration: none;
  font-size: 13px;
}

.sv-view-link:hover {
  text-decoration: underline;
}

.dark .sv-view-link {
  color: #58a6ff;
}

/* Footer */
.sv-footer {
  padding: 12px 16px;
  border-top: 1px solid #d0d7de;
  background: #f6f8fa;
}

.dark .sv-footer {
  background: #161b22;
  border-top-color: #30363d;
}

.sv-settings-link {
  display: flex;
  align-items: center;
  color: #57606a;
  text-decoration: none;
  font-size: 13px;
}

.sv-settings-link:hover {
  color: #0969da;
}

.dark .sv-settings-link {
  color: #8b949e;
}

.dark .sv-settings-link:hover {
  color: #58a6ff;
}

/* Toast notification */
.sv-toast {
  position: fixed;
  bottom: 20px;
  right: 370px;
  background: #24292f;
  color: #ffffff;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  z-index: 1000000;
  animation: sv-toast-in 0.3s ease;
}

.sv-toast.error {
  background: #cf222e;
}

@keyframes sv-toast-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Summarizing indicator */
.sv-summarizing {
  display: flex;
  align-items: center;
  color: #57606a;
  font-size: 13px;
}

.dark .sv-summarizing {
  color: #8b949e;
}

.sv-summarizing .sv-spinner {
  width: 14px;
  height: 14px;
  margin-right: 8px;
}
```

**Step 2: Verify CSS syntax**

Run:
```bash
head -50 extension/sidebar.css
```
Expected: Clean CSS code

**Step 3: Commit**

Run:
```bash
git add extension/sidebar.css && git commit -m "feat: add sidebar styles with dark mode support"
```

---

## Task 3: Background Service Worker

**Files:**
- Create: `extension/background.js`
- Create: `extension/lib/gemini.js`

**Step 1: Create Gemini API client**

Create `extension/lib/gemini.js`:
```javascript
// Gemini API client

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function buildPrompt(skillName, skillContent) {
  return `You are summarizing a Claude Code skill for developers browsing GitHub.

Skill name: ${skillName}
Skill content:
---
${skillContent}
---

Provide a concise summary (2-3 sentences) that answers:
1. What does this skill do?
2. When should a developer use it?

Keep it practical and scannable. No markdown formatting.`;
}

async function summarizeSkill(apiKey, skillName, skillContent) {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: buildPrompt(skillName, skillContent)
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200
      }
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 400) {
      throw new Error('Invalid API key');
    }
    if (response.status === 429) {
      throw new Error('Rate limited');
    }
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Empty response from Gemini');
  }

  return data.candidates[0].content.parts[0].text.trim();
}

// Export for use in background.js
if (typeof module !== 'undefined') {
  module.exports = { summarizeSkill };
}
```

**Step 2: Create background service worker**

Create `extension/background.js`:
```javascript
// Background service worker for Skill Viewer extension

// Import Gemini client (inline for service worker compatibility)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function buildPrompt(skillName, skillContent) {
  return `You are summarizing a Claude Code skill for developers browsing GitHub.

Skill name: ${skillName}
Skill content:
---
${skillContent}
---

Provide a concise summary (2-3 sentences) that answers:
1. What does this skill do?
2. When should a developer use it?

Keep it practical and scannable. No markdown formatting.`;
}

async function summarizeSkill(apiKey, skillName, skillContent) {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: buildPrompt(skillName, skillContent)
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200
      }
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 400 || response.status === 403) {
      throw new Error('Invalid API key');
    }
    if (response.status === 429) {
      throw new Error('Rate limited');
    }
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Empty response from Gemini');
  }

  return data.candidates[0].content.parts[0].text.trim();
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SUMMARIZE_SKILL') {
    handleSummarize(request)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep channel open for async response
  }

  if (request.type === 'TEST_API_KEY') {
    testApiKey(request.apiKey)
      .then(valid => sendResponse({ valid }))
      .catch(err => sendResponse({ valid: false, error: err.message }));
    return true;
  }

  if (request.type === 'FETCH_SKILL_CONTENT') {
    fetchSkillContent(request.url)
      .then(content => sendResponse({ content }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

async function handleSummarize(request) {
  const { skillName, skillContent } = request;

  // Get API key from storage
  const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');

  if (!geminiApiKey) {
    return { error: 'No API key configured', fallback: true };
  }

  // Check cache first
  const cacheKey = `summary_${request.repo}_${skillName}`;
  const cached = await chrome.storage.local.get(cacheKey);

  if (cached[cacheKey]?.summary) {
    const age = Date.now() - cached[cacheKey].timestamp;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (age < ONE_DAY) {
      return { summary: cached[cacheKey].summary, cached: true };
    }
  }

  try {
    const summary = await summarizeSkill(geminiApiKey, skillName, skillContent);

    // Cache the result
    await chrome.storage.local.set({
      [cacheKey]: {
        summary,
        timestamp: Date.now()
      }
    });

    return { summary };
  } catch (err) {
    return { error: err.message, fallback: true };
  }
}

async function testApiKey(apiKey) {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Say "ok"' }]
        }]
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function fetchSkillContent(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  return await response.text();
}

// Handle extension icon click - open options if on GitHub
chrome.action.onClicked.addListener((tab) => {
  chrome.runtime.openOptionsPage();
});
```

**Step 3: Verify files exist**

Run:
```bash
wc -l extension/background.js extension/lib/gemini.js
```
Expected: Line counts for both files

**Step 4: Commit**

Run:
```bash
git add extension/background.js extension/lib/gemini.js && git commit -m "feat: add background service worker with Gemini integration"
```

---

## Task 4: Content Script - GitHub Detection

**Files:**
- Create: `extension/content.js`

**Step 1: Create content script**

Create `extension/content.js`:
```javascript
// Content script for Skill Viewer - runs on GitHub pages

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__skillViewerLoaded) return;
  window.__skillViewerLoaded = true;

  let currentRepo = null;
  let sidebarEl = null;

  // Initialize
  init();

  function init() {
    // Check on page load
    checkForSkills();

    // Handle GitHub's SPA navigation
    document.addEventListener('turbo:load', checkForSkills);
    document.addEventListener('pjax:end', checkForSkills);

    // Fallback: watch for URL changes
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(checkForSkills, 100);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  function parseRepoFromUrl() {
    // Match github.com/owner/repo patterns
    const match = location.pathname.match(/^\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    const [, owner, repo] = match;

    // Exclude special GitHub pages
    const excluded = ['settings', 'marketplace', 'explore', 'topics', 'trending', 'collections', 'sponsors', 'notifications', 'new'];
    if (excluded.includes(owner)) return null;

    return { owner, repo, full: `${owner}/${repo}` };
  }

  function detectBranch() {
    // Try to get branch from URL /tree/branch
    const treeMatch = location.pathname.match(/\/tree\/([^/]+)/);
    if (treeMatch) return treeMatch[1];

    // Try to get from GitHub's branch selector
    const branchSelector = document.querySelector('[data-hotkey="w"] span');
    if (branchSelector) return branchSelector.textContent.trim();

    return 'main';
  }

  async function checkForSkills() {
    const repoInfo = parseRepoFromUrl();

    // Remove sidebar if not on a repo page
    if (!repoInfo) {
      removeSidebar();
      currentRepo = null;
      return;
    }

    // Skip if same repo already loaded
    if (currentRepo === repoInfo.full) return;
    currentRepo = repoInfo.full;

    // Show loading state
    showSidebar();
    renderLoading();

    try {
      const branch = detectBranch();
      const skills = await fetchSkills(repoInfo.owner, repoInfo.repo, branch);

      if (skills.length === 0) {
        renderEmpty();
        // Auto-hide after showing empty message
        setTimeout(() => {
          const { autoOpen } = await chrome.storage.local.get('autoOpen');
          if (autoOpen !== false) {
            // Keep sidebar but could optionally hide
          }
        }, 2000);
        return;
      }

      // Render skills
      await renderSkills(skills, repoInfo, branch);
    } catch (err) {
      console.error('Skill Viewer error:', err);
      renderError(err.message);
    }
  }

  async function fetchSkills(owner, repo, branch) {
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

    const response = await fetch(treeUrl);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Repository not found');
      }
      if (response.status === 403) {
        throw new Error('GitHub rate limit hit');
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const tree = data.tree || [];

    // Find skills in .claude/skills/ or skills/
    const skillPaths = ['.claude/skills/', 'skills/'];
    const skillMap = new Map();

    for (const item of tree) {
      if (item.type !== 'blob') continue;

      for (const prefix of skillPaths) {
        if (!item.path.startsWith(prefix)) continue;

        const relativePath = item.path.slice(prefix.length);
        const parts = relativePath.split('/');

        if (parts.length < 2) continue;

        const skillName = parts[0];
        const fileName = parts.slice(1).join('/');

        if (!skillMap.has(skillName)) {
          skillMap.set(skillName, {
            name: skillName,
            path: `${prefix}${skillName}`,
            files: []
          });
        }

        skillMap.get(skillName).files.push({
          name: fileName,
          path: item.path
        });
      }
    }

    // Sort: SKILL.md first
    for (const skill of skillMap.values()) {
      skill.files.sort((a, b) => {
        if (a.name === 'SKILL.md') return -1;
        if (b.name === 'SKILL.md') return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return Array.from(skillMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  // Sidebar rendering functions
  function showSidebar() {
    if (sidebarEl) {
      sidebarEl.classList.remove('hidden');
      return;
    }

    sidebarEl = document.createElement('div');
    sidebarEl.id = 'skill-viewer-sidebar';
    sidebarEl.innerHTML = `
      <div class="sv-header">
        <h2>Claude Skills</h2>
        <button class="sv-close-btn" title="Close">✕</button>
      </div>
      <div class="sv-content"></div>
      <div class="sv-footer">
        <a href="#" class="sv-settings-link">⚙️ Settings</a>
      </div>
    `;

    // Apply dark mode if needed
    chrome.storage.local.get('darkMode', ({ darkMode }) => {
      if (darkMode) sidebarEl.classList.add('dark');
    });

    document.body.appendChild(sidebarEl);

    // Bind events
    sidebarEl.querySelector('.sv-close-btn').addEventListener('click', () => {
      sidebarEl.classList.add('hidden');
    });

    sidebarEl.querySelector('.sv-settings-link').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  function removeSidebar() {
    if (sidebarEl) {
      sidebarEl.remove();
      sidebarEl = null;
    }
  }

  function renderLoading() {
    const content = sidebarEl.querySelector('.sv-content');
    content.innerHTML = `
      <div class="sv-loading">
        <div class="sv-spinner"></div>
        Scanning for skills...
      </div>
    `;
  }

  function renderEmpty() {
    const content = sidebarEl.querySelector('.sv-content');
    content.innerHTML = `
      <div class="sv-empty">
        No Claude skills found in this repository.
      </div>
    `;
  }

  function renderError(message) {
    const content = sidebarEl.querySelector('.sv-content');
    content.innerHTML = `
      <div class="sv-empty">
        Error: ${escapeHtml(message)}
      </div>
    `;
  }

  async function renderSkills(skills, repoInfo, branch) {
    const content = sidebarEl.querySelector('.sv-content');

    // Update header with count
    sidebarEl.querySelector('.sv-header h2').textContent = `Claude Skills (${skills.length})`;

    content.innerHTML = skills.map((skill, index) => `
      <div class="sv-skill ${index >= 2 ? 'collapsed' : ''}" data-skill="${escapeHtml(skill.name)}">
        <div class="sv-skill-header">
          <span class="sv-chevron">▼</span>
          <span class="sv-skill-name">${escapeHtml(skill.name)}</span>
        </div>
        <div class="sv-skill-body">
          <div class="sv-summarizing">
            <div class="sv-spinner"></div>
            Loading...
          </div>
        </div>
      </div>
    `).join('');

    // Bind collapse toggle
    content.querySelectorAll('.sv-skill-header').forEach(header => {
      header.addEventListener('click', () => {
        header.parentElement.classList.toggle('collapsed');
      });
    });

    // Load content for each skill
    for (const skill of skills) {
      const skillFile = skill.files.find(f => f.name === 'SKILL.md');
      if (!skillFile) continue;

      const rawUrl = `https://raw.githubusercontent.com/${repoInfo.owner}/${repoInfo.repo}/${branch}/${skillFile.path}`;
      const githubUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${branch}/${skillFile.path}`;

      try {
        // Fetch skill content
        const response = await chrome.runtime.sendMessage({
          type: 'FETCH_SKILL_CONTENT',
          url: rawUrl
        });

        if (response.error) {
          throw new Error(response.error);
        }

        const skillContent = response.content;

        // Try to summarize
        const summaryResponse = await chrome.runtime.sendMessage({
          type: 'SUMMARIZE_SKILL',
          repo: repoInfo.full,
          skillName: skill.name,
          skillContent
        });

        const skillEl = content.querySelector(`[data-skill="${skill.name}"] .sv-skill-body`);

        if (summaryResponse.summary && !summaryResponse.fallback) {
          skillEl.innerHTML = `
            <div class="sv-summary">${escapeHtml(summaryResponse.summary)}</div>
            <a href="${githubUrl}" target="_blank" class="sv-view-link">View Full Skill →</a>
          `;
        } else {
          // Show raw content
          const rendered = renderBasicMarkdown(skillContent);
          skillEl.innerHTML = `
            <div class="sv-raw-content">${rendered}</div>
            <a href="${githubUrl}" target="_blank" class="sv-view-link">View on GitHub →</a>
          `;

          if (summaryResponse.error && summaryResponse.error !== 'No API key configured') {
            showToast(summaryResponse.error, true);
          }
        }
      } catch (err) {
        const skillEl = content.querySelector(`[data-skill="${skill.name}"] .sv-skill-body`);
        skillEl.innerHTML = `
          <div class="sv-empty">Failed to load skill</div>
        `;
      }
    }
  }

  function renderBasicMarkdown(text) {
    // Very basic markdown rendering for fallback
    return text
      // Escape HTML first
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Then apply markdown
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  function showToast(message, isError = false) {
    const existing = document.querySelector('.sv-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `sv-toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
```

**Step 2: Verify content script**

Run:
```bash
wc -l extension/content.js
```
Expected: ~300 lines

**Step 3: Commit**

Run:
```bash
git add extension/content.js && git commit -m "feat: add content script with GitHub detection and sidebar"
```

---

## Task 5: Options Page (Settings)

**Files:**
- Create: `extension/options.html`
- Create: `extension/options.js`

**Step 1: Create options HTML**

Create `extension/options.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skill Viewer Settings</title>
  <style>
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f6f8fa;
      --text-primary: #24292f;
      --text-secondary: #57606a;
      --border-color: #d0d7de;
      --accent-color: #0969da;
      --accent-hover: #0550ae;
      --success-color: #1a7f37;
      --error-color: #cf222e;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: var(--bg-secondary);
      color: var(--text-primary);
      line-height: 1.6;
      padding: 40px;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background: var(--bg-primary);
      border-radius: 8px;
      border: 1px solid var(--border-color);
      padding: 24px;
    }

    h1 {
      font-size: 24px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .section {
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
    }

    input[type="password"],
    input[type="text"] {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 14px;
      margin-bottom: 8px;
    }

    input:focus {
      outline: none;
      border-color: var(--accent-color);
      box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15);
    }

    .hint {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }

    .hint a {
      color: var(--accent-color);
    }

    .button-group {
      display: flex;
      gap: 8px;
    }

    button {
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid var(--border-color);
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    button:hover {
      background: var(--bg-secondary);
    }

    button.primary {
      background: var(--accent-color);
      color: white;
      border-color: var(--accent-color);
    }

    button.primary:hover {
      background: var(--accent-hover);
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .status {
      margin-top: 12px;
      padding: 10px;
      border-radius: 6px;
      font-size: 13px;
      display: none;
    }

    .status.success {
      display: block;
      background: #dafbe1;
      color: var(--success-color);
      border: 1px solid #a7f3d0;
    }

    .status.error {
      display: block;
      background: #ffebe9;
      color: var(--error-color);
      border: 1px solid #ff8182;
    }

    .checkbox-group {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--border-color);
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
    }

    .checkbox-item input {
      margin-right: 10px;
      width: 16px;
      height: 16px;
    }

    .checkbox-item label {
      margin: 0;
      font-weight: normal;
    }

    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
      font-size: 12px;
      color: var(--text-secondary);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Skill Viewer Settings</h1>

    <div class="section">
      <div class="section-title">Gemini API Key</div>
      <label for="api-key">API Key</label>
      <input type="password" id="api-key" placeholder="AIza...">
      <p class="hint">
        Get your free API key at
        <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com</a>.
        Without a key, raw skill content will be shown instead of AI summaries.
      </p>
      <div class="button-group">
        <button id="test-btn">Test Key</button>
        <button id="save-btn" class="primary">Save</button>
      </div>
      <div id="status" class="status"></div>
    </div>

    <div class="checkbox-group">
      <div class="checkbox-item">
        <input type="checkbox" id="auto-open" checked>
        <label for="auto-open">Auto-open sidebar when skills are found</label>
      </div>
      <div class="checkbox-item">
        <input type="checkbox" id="dark-mode">
        <label for="dark-mode">Dark mode</label>
      </div>
    </div>

    <div class="footer">
      Skill Viewer v1.0.0 |
      <a href="https://github.com/anthropics/claude-code" target="_blank">Claude Code</a>
    </div>
  </div>

  <script src="options.js"></script>
</body>
</html>
```

**Step 2: Create options JavaScript**

Create `extension/options.js`:
```javascript
// Options page logic

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Load saved settings
  const settings = await chrome.storage.local.get([
    'geminiApiKey',
    'autoOpen',
    'darkMode'
  ]);

  document.getElementById('api-key').value = settings.geminiApiKey || '';
  document.getElementById('auto-open').checked = settings.autoOpen !== false;
  document.getElementById('dark-mode').checked = settings.darkMode === true;

  // Bind events
  document.getElementById('test-btn').addEventListener('click', testApiKey);
  document.getElementById('save-btn').addEventListener('click', saveSettings);
  document.getElementById('auto-open').addEventListener('change', saveCheckboxes);
  document.getElementById('dark-mode').addEventListener('change', saveCheckboxes);
}

async function testApiKey() {
  const apiKey = document.getElementById('api-key').value.trim();
  const statusEl = document.getElementById('status');
  const testBtn = document.getElementById('test-btn');

  if (!apiKey) {
    showStatus('Please enter an API key first', 'error');
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = 'Testing...';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TEST_API_KEY',
      apiKey
    });

    if (response.valid) {
      showStatus('API key is valid!', 'success');
    } else {
      showStatus('Invalid API key. Please check and try again.', 'error');
    }
  } catch (err) {
    showStatus('Error testing key: ' + err.message, 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = 'Test Key';
  }
}

async function saveSettings() {
  const apiKey = document.getElementById('api-key').value.trim();
  const saveBtn = document.getElementById('save-btn');

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    await chrome.storage.local.set({ geminiApiKey: apiKey });
    showStatus('Settings saved!', 'success');
  } catch (err) {
    showStatus('Error saving: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
}

async function saveCheckboxes() {
  const autoOpen = document.getElementById('auto-open').checked;
  const darkMode = document.getElementById('dark-mode').checked;

  await chrome.storage.local.set({ autoOpen, darkMode });
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;

  setTimeout(() => {
    statusEl.className = 'status';
  }, 3000);
}
```

**Step 3: Verify files**

Run:
```bash
ls -la extension/options.*
```
Expected: Both options.html and options.js listed

**Step 4: Commit**

Run:
```bash
git add extension/options.html extension/options.js && git commit -m "feat: add options page for API key and settings"
```

---

## Task 6: Create Real Icons

**Files:**
- Update: `extension/icons/icon16.png`
- Update: `extension/icons/icon48.png`
- Update: `extension/icons/icon128.png`

**Step 1: Create SVG icon source**

Create a simple icon using an inline data URL approach. We'll create a purple/blue gradient icon with a skill/code symbol.

Run the following to create proper PNG icons using base64:
```bash
# Create a simple purple square icon as base64 PNG
# 16x16 purple icon
echo 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAOklEQVQ4T2NkoBAwUqifYdQABkrDgJGRkZGBgYHhPzk2AAVHhQGQWgbiM1I7DIYtIqkaEGUAuQkJAG9CCxGKCKOAAAAAAElFTkSuQmCC' | base64 -d > extension/icons/icon16.png

# 48x48 purple icon
echo 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAhElEQVRoQ+2WwQ3AIAwDk+7/aDoAUnkaVKn5AOKE5AgfJF/vN/jR4HcXaAe0A5V/oVeg7oH36mHtpxqwa0C3gLZQe/D/PrPzA7oFZgpQDSj3wKoB1UQ2fmZGAaXHrhtQLVRL4JdukPWsyh94UtL6CuwOUEug9Ni5BuYaGFyBbqGZCgwO+ADvrb8xFWaKoAAAAABJRU5ErkJggg==' | base64 -d > extension/icons/icon48.png

# 128x128 purple icon
echo 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAA0klEQVR4Xu3WMQ0AMAzAsOL+RR+JsWAH9EnZnZl5O/w9YAb4fYLvAzYA/wewAfwfwAbwfwAbwP8BbAD/B7AB/B/ABvB/ABvA/wFsAP8HsAH8H8AG8H8AG8D/AWwA/wewAfwfwAbwfwAbwP8BbAD/B7AB/B/ABvB/ABvA/wFsAP8HsAH8H8AG8H8AG8D/AWwA/wewAfwfwAbwfwAbwP8BbAD/B7AB/B/ABvB/ABvA/wFsAP8HsAH8H8AG8H8AG8D/AWwA/wdoA8zMJGaAAZqkJgaAL1kAAAAASUVORK5CYII=' | base64 -d > extension/icons/icon128.png
```

Note: These are placeholder solid purple squares. For production, replace with proper designed icons.

**Step 2: Verify icons created**

Run:
```bash
file extension/icons/*.png
```
Expected: PNG image data for each file

**Step 3: Commit**

Run:
```bash
git add extension/icons/ && git commit -m "feat: add extension icons"
```

---

## Task 7: Manual Testing

**Step 1: Load extension in Chrome**

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension/` folder
5. Verify extension appears with purple icon

**Step 2: Test on GitHub**

1. Navigate to a repo with Claude skills, e.g.:
   - `https://github.com/anthropics/claude-code`
   - Or any repo with `.claude/skills/` folder
2. Verify sidebar appears
3. Verify skills are listed

**Step 3: Test settings**

1. Click extension icon or go to sidebar Settings
2. Add Gemini API key (get from aistudio.google.com)
3. Click "Test Key" - verify success message
4. Click "Save"
5. Refresh GitHub page
6. Verify AI summaries appear instead of raw content

**Step 4: Test fallback**

1. Go to options, clear API key, save
2. Refresh GitHub page
3. Verify raw SKILL.md content appears (not summaries)

**Step 5: Test edge cases**

1. Visit non-repo GitHub pages (github.com/explore) - sidebar should not appear
2. Visit repo without skills - sidebar shows "No skills found"
3. Toggle dark mode in settings - verify sidebar updates

---

## Task 8: Final Polish & Commit

**Step 1: Update manifest version if needed**

Verify `extension/manifest.json` has correct version.

**Step 2: Final commit**

Run:
```bash
git status
```

If any uncommitted changes:
```bash
git add -A && git commit -m "chore: final polish and cleanup"
```

**Step 3: Create summary commit**

Run:
```bash
git log --oneline -10
```

Extension is complete and ready for use!

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Extension scaffold | manifest.json, icons |
| 2 | Sidebar styles | sidebar.css |
| 3 | Background worker | background.js, lib/gemini.js |
| 4 | Content script | content.js |
| 5 | Options page | options.html, options.js |
| 6 | Icons | icons/*.png |
| 7 | Manual testing | - |
| 8 | Final polish | - |
