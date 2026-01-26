# Private Repository Skill Fetch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable skill detection and content fetching from private GitHub repositories when users have local LLM keys configured.

**Architecture:** When GitHub API fails (403/404), detect if user has access via DOM (can see file tree). If yes, extract skill list from DOM, then fetch content using `fetch(rawUrl, { credentials: 'include' })` with fallback to background tab scraping.

**Tech Stack:** Chrome Extension APIs (tabs, scripting), DOM manipulation, fetch with credentials

---

## Task 1: Add Required Permissions to Manifest

**Files:**
- Modify: `extension/manifest.json:6-10`

**Step 1: Add scripting and tabs permissions**

Edit `extension/manifest.json`, change permissions array from:

```json
"permissions": [
  "storage",
  "activeTab",
  "identity"
],
```

To:

```json
"permissions": [
  "storage",
  "activeTab",
  "identity",
  "scripting",
  "tabs"
],
```

**Step 2: Verify manifest is valid JSON**

Run: Open `chrome://extensions`, click "Load unpacked" or reload extension
Expected: Extension loads without errors

**Step 3: Commit**

```bash
git add extension/manifest.json
git commit -m "feat: add scripting and tabs permissions for private repo support"
```

---

## Task 2: Add Private Repo Detection in content.js

**Files:**
- Modify: `extension/content.js:96-109`

**Step 1: Create helper function to detect private repo accessibility**

Add after line 58 (after `detectBranch` function):

```javascript
function isPrivateRepoAccessible() {
  // Check if page has visible file tree (user is logged in and has access)
  const hasFileTree = document.querySelector('[aria-label="Folders and files"]')
                   || document.querySelector('.js-navigation-container')
                   || document.querySelector('[data-testid="repos-file-tree-container"]');
  return hasFileTree !== null;
}
```

**Step 2: Verify function exists**

Run: Open browser console on any GitHub repo page, paste `isPrivateRepoAccessible()`
Expected: Returns `true` on repo pages with visible files

**Step 3: Commit**

```bash
git add extension/content.js
git commit -m "feat: add private repo accessibility detection"
```

---

## Task 3: Add DOM-based Skill Extraction

**Files:**
- Modify: `extension/content.js` (add after `isPrivateRepoAccessible` function)

**Step 1: Create function to extract skills from DOM**

Add after `isPrivateRepoAccessible` function:

```javascript
function extractSkillsFromDOM() {
  const skills = [];
  const skillPaths = new Set();

  // Find all file/folder links in the file tree
  const links = document.querySelectorAll('a[href*="/blob/"], a[href*="/tree/"]');

  for (const link of links) {
    const href = link.getAttribute('href') || '';

    // Check if path contains skills directory
    const skillMatch = href.match(/\/(blob|tree)\/[^/]+\/(.+)/);
    if (!skillMatch) continue;

    const filePath = skillMatch[2];

    // Match .claude/skills/ or skills/ patterns
    let skillDir = null;
    if (filePath.includes('.claude/skills/')) {
      skillDir = '.claude/skills/';
    } else if (filePath.includes('skills/')) {
      skillDir = 'skills/';
    }

    if (!skillDir) continue;

    const idx = filePath.indexOf(skillDir);
    const afterSkillsDir = filePath.slice(idx + skillDir.length);
    const parts = afterSkillsDir.split('/');

    if (parts.length === 0 || !parts[0]) continue;

    // Skill name is first part after skills/
    const skillName = parts[0].replace(/\.md$/, '');
    const skillPath = filePath.slice(0, idx + skillDir.length) + (parts[0].endsWith('.md') ? parts[0] : skillName);

    if (skillPaths.has(skillPath)) continue;
    skillPaths.add(skillPath);

    const isSingleFile = parts[0].endsWith('.md');

    skills.push({
      name: skillName,
      path: skillPath,
      isSingleFile,
      files: isSingleFile
        ? [{ name: parts[0], path: filePath }]
        : [] // Will be populated if needed
    });
  }

  return skills;
}
```

**Step 2: Verify function works**

Run: On a GitHub repo with skills, open console and run `extractSkillsFromDOM()`
Expected: Returns array of skill objects

**Step 3: Commit**

```bash
git add extension/content.js
git commit -m "feat: add DOM-based skill extraction"
```

---

## Task 4: Modify fetchSkills to Fallback to DOM

**Files:**
- Modify: `extension/content.js:96-109`

**Step 1: Modify fetchSkills to handle private repos**

Replace the `fetchSkills` function (lines 96-193) with:

```javascript
async function fetchSkills(owner, repo, branch) {
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

  const response = await fetch(treeUrl);

  // Handle API failures - try DOM fallback for private repos
  if (!response.ok) {
    if (response.status === 404 || response.status === 403) {
      // Check if user can see the repo (private but has access)
      if (isPrivateRepoAccessible()) {
        const domSkills = extractSkillsFromDOM();
        if (domSkills.length > 0) {
          // Mark as private repo mode
          domSkills.isPrivateRepo = true;
          return domSkills;
        }
      }

      if (response.status === 404) {
        throw new Error('Repository not found');
      }
      throw new Error('GitHub rate limit hit');
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  const tree = data.tree || [];

  // Find skills in .claude/skills/ or skills/ at any depth
  // Patterns: starts with or contains /.claude/skills/ or /skills/
  const skillPatterns = ['.claude/skills/', 'skills/'];
  const skillMap = new Map();

  for (const item of tree) {
    if (item.type !== 'blob') continue;

    for (const pattern of skillPatterns) {
      // Check if path starts with pattern or contains /pattern
      let matchIndex = -1;
      if (item.path.startsWith(pattern)) {
        matchIndex = 0;
      } else {
        const nestedPattern = '/' + pattern;
        const idx = item.path.indexOf(nestedPattern);
        if (idx !== -1) {
          matchIndex = idx + 1; // +1 to skip the leading /
        }
      }

      if (matchIndex === -1) continue;

      const prefixEnd = matchIndex + pattern.length;
      const relativePath = item.path.slice(prefixEnd);
      const parts = relativePath.split('/');

      // Handle both single-file skills (.claude/skills/skill-name.md)
      // and folder-based skills (.claude/skills/skill-name/SKILL.md)
      let skillName, fileName, skillPath;

      if (parts.length === 1 && parts[0].endsWith('.md')) {
        // Single-file skill: .claude/skills/my-skill.md
        skillName = parts[0].replace(/\.md$/, '');
        fileName = parts[0]; // The file itself is the skill definition
        skillPath = item.path; // Full path to the file
      } else if (parts.length >= 2) {
        // Folder-based skill: .claude/skills/skill-name/SKILL.md
        skillName = parts[0];
        fileName = parts.slice(1).join('/');
        skillPath = item.path.slice(0, prefixEnd) + skillName;
      } else {
        continue;
      }

      // Use full path as key to distinguish skills in different locations
      const skillKey = skillPath;

      if (!skillMap.has(skillKey)) {
        // For display, include parent context if nested
        const parentPath = item.path.slice(0, matchIndex);
        const displayName = parentPath ? `${parentPath.replace(/\/$/, '')}/${skillName}` : skillName;

        skillMap.set(skillKey, {
          name: displayName,
          path: skillPath,
          files: []
        });
      }

      skillMap.get(skillKey).files.push({
        name: fileName,
        path: item.path
      });

      break; // Don't double-match the same file
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

  const skills = Array.from(skillMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  skills.isPrivateRepo = false;
  return skills;
}
```

**Step 2: Test on public repo**

Run: Visit a public GitHub repo with skills
Expected: Skills load normally via API

**Step 3: Commit**

```bash
git add extension/content.js
git commit -m "feat: add DOM fallback for private repo skill detection"
```

---

## Task 5: Add Private Repo Content Fetching to background.js

**Files:**
- Modify: `extension/background.js:281-309`

**Step 1: Add FETCH_PRIVATE_SKILL message handler**

Add after line 308 (before the closing of the message listener):

```javascript
if (request.type === 'FETCH_PRIVATE_SKILL') {
  fetchPrivateSkillContent(request.owner, request.repo, request.branch, request.skillPath)
    .then(content => sendResponse({ content }))
    .catch(err => sendResponse({ error: err.message }));
  return true;
}
```

**Step 2: Add the fetchPrivateSkillContent function**

Add after the `fetchSkillContent` function (after line 384):

```javascript
async function fetchPrivateSkillContent(owner, repo, branch, skillPath) {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${skillPath}`;

  // Try fetch with credentials first (uses GitHub session cookie)
  try {
    const response = await fetch(rawUrl, {
      credentials: 'include',
      mode: 'cors'
    });

    if (response.ok) {
      return await response.text();
    }
  } catch (err) {
    console.log('Fetch with credentials failed:', err.message);
  }

  // Fallback: fetch via background tab
  return await fetchViaBackgroundTab(owner, repo, branch, skillPath);
}

async function fetchViaBackgroundTab(owner, repo, branch, skillPath) {
  const fileUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${skillPath}`;

  // Create inactive tab
  const tab = await chrome.tabs.create({ url: fileUrl, active: false });

  // Wait for page to load
  await new Promise(resolve => {
    const listener = (tabId, info) => {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });

  // Small delay to ensure DOM is ready
  await new Promise(resolve => setTimeout(resolve, 500));

  // Extract content from page
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // Try multiple selectors for GitHub's file content
      const codeBlock = document.querySelector('[data-code-text]');
      if (codeBlock) {
        return codeBlock.getAttribute('data-code-text');
      }

      const blobContent = document.querySelector('.blob-code-content');
      if (blobContent) {
        return blobContent.textContent;
      }

      const rawContent = document.querySelector('[data-plain]');
      if (rawContent) {
        return rawContent.textContent;
      }

      // Try the new GitHub file viewer
      const lines = document.querySelectorAll('.react-code-line-contents');
      if (lines.length > 0) {
        return Array.from(lines).map(l => l.textContent).join('\n');
      }

      return null;
    }
  });

  // Close tab
  await chrome.tabs.remove(tab.id);

  const content = results?.[0]?.result;
  if (!content) {
    throw new Error('Could not extract content from page');
  }

  return content;
}
```

**Step 3: Verify background.js loads without errors**

Run: Reload extension, check for errors in service worker console
Expected: No errors

**Step 4: Commit**

```bash
git add extension/background.js
git commit -m "feat: add private skill content fetching with background tab fallback"
```

---

## Task 6: Update renderSkills for Private Repo Mode

**Files:**
- Modify: `extension/content.js:311-414`

**Step 1: Modify renderSkills to handle private repo mode**

Replace the `renderSkills` function with:

```javascript
async function renderSkills(skills, repoInfo, branch) {
  // Store for collect feature
  window.__skillViewerRepoInfo = { repoInfo, branch };

  const isPrivateRepo = skills.isPrivateRepo === true;

  const content = sidebarEl.querySelector('.sv-content');

  // Update header with count and private indicator
  const headerText = isPrivateRepo
    ? `Claude Skills (${skills.length}) 🔒`
    : `Claude Skills (${skills.length})`;
  sidebarEl.querySelector('.sv-header h2').textContent = headerText;

  content.innerHTML = skills.map((skill, index) => `
    <div class="sv-skill ${index >= 2 ? 'collapsed' : ''}" data-skill="${escapeHtml(skill.name)}" data-skill-path="${escapeHtml(skill.path)}" data-private="${isPrivateRepo}">
      <div class="sv-skill-header">
        <span class="sv-chevron">▼</span>
        <span class="sv-skill-name">${escapeHtml(skill.name)}</span>
        <button class="sv-collect-btn" data-skill="${escapeHtml(skill.name)}" data-path="${escapeHtml(skill.path)}">Collect</button>
      </div>
      <div class="sv-skill-body">
        <div class="sv-summarizing">
          <div class="sv-spinner"></div>
          ${isPrivateRepo ? 'Click to load...' : 'Loading...'}
        </div>
      </div>
    </div>
  `).join('');

  // Bind collapse toggle
  content.querySelectorAll('.sv-skill-header').forEach(header => {
    header.addEventListener('click', (e) => {
      const skillEl = header.parentElement;
      skillEl.classList.toggle('collapsed');

      // For private repos, load content on expand if not loaded
      if (isPrivateRepo && !skillEl.classList.contains('collapsed') && !skillEl.dataset.loaded) {
        loadPrivateSkillContent(skillEl, repoInfo, branch);
      }
    });
  });

  // Bind collect buttons
  content.querySelectorAll('.sv-collect-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering collapse
      const skillName = btn.dataset.skill;
      const skillPath = btn.dataset.path;
      showCollectModal(skillName, skillPath);
    });
  });

  // For public repos, load content immediately
  if (!isPrivateRepo) {
    for (const skill of skills) {
      await loadSkillContent(skill, repoInfo, branch, content);
    }
  } else {
    // For private repos, auto-load first 2 expanded skills
    const expandedSkills = content.querySelectorAll('.sv-skill:not(.collapsed)');
    for (const skillEl of expandedSkills) {
      await loadPrivateSkillContent(skillEl, repoInfo, branch);
    }
  }
}

async function loadSkillContent(skill, repoInfo, branch, content) {
  // Support both single-file skills (.claude/skills/skill-name.md)
  // and folder-based skills (.claude/skills/skill-name/SKILL.md)
  const isSingleFileSkill = skill.path.endsWith('.md');
  const skillFile = isSingleFileSkill
    ? skill.files[0]  // Single-file: the only file is the skill definition
    : skill.files.find(f => f.name === 'SKILL.md');  // Folder-based: look for SKILL.md
  if (!skillFile) return;

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
      skillPath: skill.path,
      skillContent
    });

    const skillEl = content.querySelector(`[data-skill="${skill.name}"] .sv-skill-body`);

    if (summaryResponse.summary && !summaryResponse.fallback) {
      skillEl.innerHTML = `
        <div class="sv-summary">${renderSummary(summaryResponse.summary)}</div>
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

async function loadPrivateSkillContent(skillEl, repoInfo, branch) {
  if (skillEl.dataset.loaded) return;
  skillEl.dataset.loaded = 'true';

  const skillName = skillEl.dataset.skill;
  const skillPath = skillEl.dataset.skillPath;
  const bodyEl = skillEl.querySelector('.sv-skill-body');

  // Determine the file path to fetch
  const isSingleFile = skillPath.endsWith('.md');
  const filePath = isSingleFile ? skillPath : `${skillPath}/SKILL.md`;
  const githubUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${branch}/${filePath}`;

  bodyEl.innerHTML = `
    <div class="sv-summarizing">
      <div class="sv-spinner"></div>
      Loading content...
    </div>
  `;

  try {
    // Fetch content via background script (handles credentials + fallback)
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_PRIVATE_SKILL',
      owner: repoInfo.owner,
      repo: repoInfo.repo,
      branch: branch,
      skillPath: filePath
    });

    if (response.error) {
      throw new Error(response.error);
    }

    const skillContent = response.content;

    // Try to summarize
    const summaryResponse = await chrome.runtime.sendMessage({
      type: 'SUMMARIZE_SKILL',
      repo: repoInfo.full,
      skillName: skillName,
      skillPath: skillPath,
      skillContent,
      isPrivate: true
    });

    if (summaryResponse.summary && !summaryResponse.fallback) {
      bodyEl.innerHTML = `
        <div class="sv-summary">${renderSummary(summaryResponse.summary)}</div>
        <a href="${githubUrl}" target="_blank" class="sv-view-link">View Full Skill →</a>
      `;
    } else {
      // Show raw content
      const rendered = renderBasicMarkdown(skillContent);
      bodyEl.innerHTML = `
        <div class="sv-raw-content">${rendered}</div>
        <a href="${githubUrl}" target="_blank" class="sv-view-link">View on GitHub →</a>
      `;

      if (summaryResponse.error && summaryResponse.error !== 'No API key configured') {
        showToast(summaryResponse.error, true);
      }
    }
  } catch (err) {
    console.error('Failed to load private skill:', err);
    bodyEl.innerHTML = `
      <div class="sv-empty">Failed to load: ${escapeHtml(err.message)}</div>
      <a href="${githubUrl}" target="_blank" class="sv-view-link">View on GitHub →</a>
    `;
  }
}
```

**Step 2: Test on public repo**

Run: Visit a public GitHub repo with skills
Expected: Skills load normally, no changes to behavior

**Step 3: Commit**

```bash
git add extension/content.js
git commit -m "feat: update renderSkills for private repo on-demand loading"
```

---

## Task 7: Update Cache Key for Private Repos

**Files:**
- Modify: `extension/background.js:354`

**Step 1: Modify cache key to distinguish private repos**

In `handleSummarize` function, change line 354 from:

```javascript
const cacheKey = `summary_${repo}_${skillName}_${summaryLanguage}`;
```

To:

```javascript
const isPrivate = request.isPrivate ? 'private_' : '';
const cacheKey = `summary_${isPrivate}${repo}_${skillName}_${summaryLanguage}`;
```

**Step 2: Verify cache works**

Run: Load a skill, check chrome.storage.local for cache entry
Expected: Cache key contains appropriate prefix

**Step 3: Commit**

```bash
git add extension/background.js
git commit -m "feat: add private repo prefix to cache keys"
```

---

## Task 8: Integration Testing

**Step 1: Test public repo**

Run: Visit `https://github.com/anthropics/claude-code-plugins`
Expected: Skills load via API, no 🔒 indicator

**Step 2: Test private repo (if available)**

Run: Visit a private repo you have access to that contains `.claude/skills/`
Expected:
1. Skills detected from DOM
2. 🔒 indicator shown in header
3. Skills show "Click to load..."
4. Expanding skill fetches content
5. Summary generated using local LLM key

**Step 3: Test fallback behavior**

Run: Block raw.githubusercontent.com in DevTools, try loading private skill
Expected: Content fetched via background tab fallback

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete private repository skill support

- Add DOM-based skill detection for private repos
- Add fetch with credentials for content retrieval
- Add background tab fallback when fetch fails
- Add on-demand loading for private repo skills
- Add visual indicator for private repo mode"
```

---

## Summary

| Task | Description |
|------|-------------|
| 1 | Add permissions to manifest.json |
| 2 | Add private repo detection function |
| 3 | Add DOM-based skill extraction |
| 4 | Modify fetchSkills for DOM fallback |
| 5 | Add background.js content fetching |
| 6 | Update renderSkills for private mode |
| 7 | Update cache keys for private repos |
| 8 | Integration testing |
