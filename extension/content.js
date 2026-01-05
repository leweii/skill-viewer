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

    try {
      const branch = detectBranch();
      const skills = await fetchSkills(repoInfo.owner, repoInfo.repo, branch);

      // Don't show sidebar if no skills found
      if (skills.length === 0) {
        removeSidebar();
        return;
      }

      // Show sidebar only when skills are found
      showSidebar();

      // Render skills
      await renderSkills(skills, repoInfo, branch);
    } catch (err) {
      console.error('Skill Viewer error:', err);
      // Don't show error sidebar, just log it
      removeSidebar();
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
      <div class="sv-resize-handle"></div>
      <div class="sv-header">
        <h2>Claude Skills</h2>
        <button class="sv-close-btn" title="Close">✕</button>
      </div>
      <div class="sv-content"></div>
      <div class="sv-footer">
        <a href="#" class="sv-settings-link">Settings</a>
      </div>
    `;

    // Load saved width and dark mode
    chrome.storage.local.get(['darkMode', 'sidebarWidth'], (settings) => {
      if (settings.darkMode) sidebarEl.classList.add('dark');
      if (settings.sidebarWidth) {
        sidebarEl.style.width = settings.sidebarWidth + 'px';
      }
    });

    document.body.appendChild(sidebarEl);

    // Bind close button
    sidebarEl.querySelector('.sv-close-btn').addEventListener('click', () => {
      sidebarEl.classList.add('hidden');
    });

    // Bind settings link
    sidebarEl.querySelector('.sv-settings-link').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
    });

    // Setup resize handle
    setupResizeHandle();
  }

  function setupResizeHandle() {
    const handle = sidebarEl.querySelector('.sv-resize-handle');
    const MIN_WIDTH = 250;
    const MAX_WIDTH = 600;
    let isResizing = false;

    handle.addEventListener('mousedown', (e) => {
      isResizing = true;
      handle.classList.add('dragging');
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;

      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth));
      sidebarEl.style.width = clampedWidth + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!isResizing) return;
      isResizing = false;
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Save width
      const width = parseInt(sidebarEl.style.width) || 350;
      chrome.storage.local.set({ sidebarWidth: width });
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
