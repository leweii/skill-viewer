// Content script for Skill Viewer - runs on GitHub pages

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__skillViewerLoaded) return;
  window.__skillViewerLoaded = true;

  let currentRepo = null;
  let sidebarEl = null;

  // Register ACTIVATE listener before anything else
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ACTIVATE') {
      if (window.__skillViewerInitialized) {
        // Already initialized — toggle sidebar or re-check if no sidebar exists
        if (sidebarEl) {
          sidebarEl.classList.toggle('hidden');
        } else {
          checkForSkills();
        }
      } else {
        init();
      }
      sendResponse({ success: true });
    }
    return true;
  });

  // Initialize only if autoLoad is enabled
  chrome.storage.local.get(['autoLoad'], (settings) => {
    if (settings.autoLoad === true) {
      init();
    }
  });

  function init() {
    window.__skillViewerInitialized = true;
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

  function isPrivateRepoAccessible() {
    // Check if page has visible file/folder links (user is logged in and has access)
    // Using actual links instead of container selectors which GitHub changes frequently
    const hasFileLinks = document.querySelectorAll('a[href*="/blob/"], a[href*="/tree/"]').length > 0;
    return hasFileLinks;
  }

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

      // Match platform skills/ patterns
      let skillDir = null;
      const skillDirPatterns = ['.claude/skills/', '.gemini/skills/', '.opencode/skills/', '.codex/skills/', '.cursor/skills/', 'skills/'];
      for (const pattern of skillDirPatterns) {
        if (filePath.includes(pattern)) {
          skillDir = pattern;
          break;
        }
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

  function detectPotentialSkillsDirs() {
    // Check if .claude or skills folder exists in the visible file tree
    // This helps detect private repos where we need to fetch skills via background tab
    const links = document.querySelectorAll('a[href*="/tree/"]');
    const potentialDirs = [];

    const platformFolders = [
      { pattern: /\/tree\/[^/]+\/\.claude$/, path: '.claude/skills' },
      { pattern: /\/tree\/[^/]+\/\.gemini$/, path: '.gemini/skills' },
      { pattern: /\/tree\/[^/]+\/\.opencode$/, path: '.opencode/skills' },
      { pattern: /\/tree\/[^/]+\/\.codex$/, path: '.codex/skills' },
      { pattern: /\/tree\/[^/]+\/\.cursor$/, path: '.cursor/skills' },
      { pattern: /\/tree\/[^/]+\/skills$/, path: 'skills' }
    ];

    for (const link of links) {
      const href = link.getAttribute('href') || '';
      for (const { pattern, path } of platformFolders) {
        if (href.match(pattern)) {
          potentialDirs.push(path);
          break;
        }
      }
    }

    return potentialDirs;
  }

  async function fetchSkillsFromFolderPage(owner, repo, branch, skillsPath) {
    // Fetch the skills folder page and extract skill names from the HTML
    const folderUrl = `https://github.com/${owner}/${repo}/tree/${branch}/${skillsPath}`;

    try {
      const response = await fetch(folderUrl, { credentials: 'include' });
      if (!response.ok) return [];

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const skills = [];
      const skillNames = new Set();

      // Find all file/folder links in the page
      const links = doc.querySelectorAll('a[href*="/blob/"], a[href*="/tree/"]');

      for (const link of links) {
        const href = link.getAttribute('href') || '';

        // Match files/folders directly under skills path
        // Pattern: /owner/repo/blob|tree/branch/skillsPath/skillName
        const pattern = new RegExp(`/${owner}/${repo}/(blob|tree)/${branch}/${skillsPath.replace(/\//g, '\\/')}/([^/]+)`);
        const match = href.match(pattern);

        if (!match) continue;

        const [, type, itemName] = match;
        const skillName = itemName.replace(/\.md$/, '');

        if (skillNames.has(skillName)) continue;
        skillNames.add(skillName);

        const isSingleFile = itemName.endsWith('.md');
        const skillPath = `${skillsPath}/${isSingleFile ? itemName : skillName}`;

        skills.push({
          name: skillName,
          path: skillPath,
          isSingleFile,
          files: isSingleFile
            ? [{ name: itemName, path: skillPath }]
            : [{ name: 'SKILL.md', path: `${skillPath}/SKILL.md` }]
        });
      }

      return skills.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.error('Failed to fetch skills folder:', err);
      return [];
    }
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

      // Don't show sidebar if no skills found and no hint
      if (skills.length === 0 && !skills.hasSkillsFolder) {
        removeSidebar();
        return;
      }

      // Show sidebar
      showSidebar();

      // Handle private repo with skills folder but no visible skills
      if (skills.length === 0 && skills.hasSkillsFolder) {
        renderPrivateRepoHint(repoInfo, branch, skills.skillsFolderPath);
        return;
      }

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

    // Handle API failures - try DOM fallback for private repos
    if (!response.ok) {
      if (response.status === 404 || response.status === 403) {
        // Check if user can see the repo (private but has access)
        if (isPrivateRepoAccessible()) {
          // Try DOM extraction for skills visible in current view
          const domSkills = extractSkillsFromDOM();
          if (domSkills.length > 0) {
            domSkills.isPrivateRepo = true;
            return domSkills;
          }

          // Check if .claude or skills folder exists but skills aren't visible
          // Try to fetch the skills folder page directly
          const potentialDirs = detectPotentialSkillsDirs();
          for (const skillsPath of potentialDirs) {
            const folderSkills = await fetchSkillsFromFolderPage(owner, repo, branch, skillsPath);
            if (folderSkills.length > 0) {
              folderSkills.isPrivateRepo = true;
              return folderSkills;
            }
          }

          // If still no skills found but folder exists, show hint
          if (potentialDirs.length > 0) {
            const emptyWithHint = [];
            emptyWithHint.isPrivateRepo = true;
            emptyWithHint.hasSkillsFolder = true;
            emptyWithHint.skillsFolderPath = potentialDirs[0];
            return emptyWithHint;
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
    const skillPatterns = ['.claude/skills/', '.gemini/skills/', '.opencode/skills/', '.codex/skills/', '.cursor/skills/', 'skills/'];
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
        <h2>AI Skills</h2>
        <div class="sv-header-actions">
          <button class="sv-autoload-btn" title="Auto-load">⚡</button>
          <button class="sv-close-btn" title="Close">✕</button>
        </div>
      </div>
      <div class="sv-content"></div>
      <div class="sv-footer">
        <a href="#" class="sv-settings-link">Settings</a>
      </div>
    `;

    document.body.appendChild(sidebarEl);

    // Bind close button
    sidebarEl.querySelector('.sv-close-btn').addEventListener('click', () => {
      sidebarEl.classList.add('hidden');
    });

    // Load saved width, dark mode, and autoLoad in one read to avoid race conditions
    const autoloadBtn = sidebarEl.querySelector('.sv-autoload-btn');
    let autoLoadEnabled = false;

    chrome.storage.local.get(['darkMode', 'sidebarWidth', 'autoLoad'], (settings) => {
      if (settings.darkMode) sidebarEl.classList.add('dark');
      if (settings.sidebarWidth) {
        sidebarEl.style.width = settings.sidebarWidth + 'px';
      }
      autoLoadEnabled = settings.autoLoad === true;
      autoloadBtn.classList.toggle('active', autoLoadEnabled);
    });

    // Toggle autoLoad flag only — use local variable to avoid async race on rapid clicks
    autoloadBtn.addEventListener('click', () => {
      autoLoadEnabled = !autoLoadEnabled;
      chrome.storage.local.set({ autoLoad: autoLoadEnabled });
      autoloadBtn.classList.toggle('active', autoLoadEnabled);
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

  function renderPrivateRepoHint(repoInfo, branch, skillsFolderPath) {
    const content = sidebarEl.querySelector('.sv-content');
    const folderUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/tree/${branch}/${skillsFolderPath}`;

    // Update header
    sidebarEl.querySelector('.sv-header h2').textContent = 'AI Skills 🔒';

    content.innerHTML = `
      <div class="sv-privacy-notice">
        <p>🔒 Private Repository</p>
        <p>We detected a skills folder but can't see its contents from here.</p>
        <p>Navigate to the skills folder to view available skills:</p>
        <a href="${folderUrl}" class="sv-view-link" style="margin-top: 8px; display: inline-block;">Open ${skillsFolderPath}/ →</a>
      </div>
    `;
  }

  async function renderSkills(skills, repoInfo, branch) {
    // Store for collect feature
    window.__skillViewerRepoInfo = { repoInfo, branch };

    const isPrivateRepo = skills.isPrivateRepo === true;

    const content = sidebarEl.querySelector('.sv-content');

    // Update header with count and private indicator
    const headerText = isPrivateRepo
      ? `AI Skills (${skills.length}) 🔒`
      : `AI Skills (${skills.length})`;
    sidebarEl.querySelector('.sv-header h2').textContent = headerText;

    // For private repos, show privacy notice at top + compact skill list
    // For public repos, first 2 are expanded with loading spinner
    let html = '';

    // Add privacy notice for private repos
    if (isPrivateRepo) {
      html += `
        <div class="sv-privacy-notice sv-privacy-notice-top">
          <p>🔒 Private Repository</p>
          <p>Private means private. We just help you find skills, nothing more.</p>
        </div>
      `;
    }

    html += skills.map((skill, index) => {
      const isCollapsed = index >= 2;
      const isSingleFile = skill.path.endsWith('.md');
      const filePath = isSingleFile ? skill.path : `${skill.path}/SKILL.md`;
      const githubUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${branch}/${filePath}`;

      // Private repo: compact view without expandable body
      if (isPrivateRepo) {
        return `
          <div class="sv-skill sv-skill-compact" data-skill="${escapeHtml(skill.name)}" data-skill-path="${escapeHtml(skill.path)}" data-private="true">
            <div class="sv-skill-header">
              <a href="${githubUrl}" target="_blank" class="sv-skill-name sv-skill-link">${escapeHtml(skill.name)}</a>
              <button class="sv-collect-btn" data-skill="${escapeHtml(skill.name)}" data-path="${escapeHtml(skill.path)}">Collect</button>
            </div>
          </div>
        `;
      }

      // Public repo: expandable with summary
      return `
        <div class="sv-skill ${isCollapsed ? 'collapsed' : ''}" data-skill="${escapeHtml(skill.name)}" data-skill-path="${escapeHtml(skill.path)}" data-private="false">
          <div class="sv-skill-header">
            <span class="sv-chevron">▼</span>
            <span class="sv-skill-name">${escapeHtml(skill.name)}</span>
            <button class="sv-collect-btn" data-skill="${escapeHtml(skill.name)}" data-path="${escapeHtml(skill.path)}">Collect</button>
          </div>
          <div class="sv-skill-body">
            <div class="sv-summarizing">
              <div class="sv-spinner"></div>
              Loading...
            </div>
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = html;

    // Bind collapse toggle (only for public repos with expandable content)
    content.querySelectorAll('.sv-skill:not(.sv-skill-compact) .sv-skill-header').forEach(header => {
      header.addEventListener('click', (e) => {
        // Don't toggle if clicking on a link or button
        if (e.target.closest('a') || e.target.closest('button')) return;
        const skillEl = header.parentElement;
        skillEl.classList.toggle('collapsed');
      });
    });

    // Bind collect buttons
    content.querySelectorAll('.sv-collect-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering collapse
        const skillPath = btn.dataset.path;
        const skillEl = btn.closest('.sv-skill');
        const isPrivate = skillEl.dataset.private === 'true';
        showCollectModal(skillPath, isPrivate);
      });
    });

    // For public repos, load content immediately
    // For private repos, content is already set with privacy message
    if (!isPrivateRepo) {
      for (const skill of skills) {
        await loadSkillContent(skill, repoInfo, branch, content);
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

  function renderSummary(summaryText) {
    // Sanitize HTML in input to prevent XSS (LLM output shouldn't contain HTML)
    const sanitizedText = summaryText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = sanitizedText.trim().split('\n');
    const firstLine = lines[0] || '';

    // Check if first line contains capability badges
    const hasBadges = firstLine.includes('⚠️') || firstLine.includes('📁');

    let html = '';

    if (hasBadges) {
      // Parse badges from first line
      const badges = firstLine.split('|').map(b => b.trim()).filter(b => b);
      html += '<div class="sv-badges">';
      for (const badge of badges) {
        const isWarning = badge.includes('⚠️') || badge.includes('⚙️') || badge.includes('☁️');
        const className = isWarning ? 'sv-badge sv-badge-warning' : 'sv-badge sv-badge-info';
        // Strip markdown bold syntax (**text**) from badge
        const cleanBadge = badge.replace(/\*\*/g, '');
        html += `<span class="${className}">${escapeHtml(cleanBadge)}</span>`;
      }
      html += '</div>';

      // Rest is description
      const description = lines.slice(1).join('\n').trim();
      if (description) {
        html += '<div class="sv-description">' + marked.parse(description) + '</div>';
      }
    } else {
      // No badges, render entire text as markdown
      html += '<div class="sv-description">' + marked.parse(sanitizedText) + '</div>';
    }

    return html;
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
    toast.className = `sv-toast ${isError ? 'error' : 'success'}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  function showCollectModal(skillPath, isPrivate) {
    // Remove existing modal
    const existing = document.querySelector('.sv-modal-overlay');
    if (existing) existing.remove();

    const { repoInfo } = window.__skillViewerRepoInfo || {};
    if (!repoInfo) {
      showToast('Error: Repository info not available', true);
      return;
    }

    const command = isPrivate
      ? `git clone https://github.com/${repoInfo.owner}/${repoInfo.repo}.git`
      : `npx skills add ${repoInfo.owner}/${repoInfo.repo}`;

    const description = isPrivate
      ? 'Clone this private repository to access the skills:'
      : 'This command will be copied to your clipboard:';

    const hint = isPrivate
      ? 'After cloning, you can manually copy skills from the skills directory (e.g. .claude/skills/, .opencode/skills/).'
      : 'Paste and run in your terminal to add all skills from this repository.';

    const overlay = document.createElement('div');
    overlay.className = 'sv-modal-overlay';

    // Auto-detect GitHub dark mode from page
    const colorMode = document.documentElement.getAttribute('data-color-mode');
    const isDark = colorMode === 'dark' ||
                   colorMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches ||
                   document.documentElement.getAttribute('data-dark-theme') ||
                   document.body.classList.contains('dark') ||
                   getComputedStyle(document.body).backgroundColor.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)?.slice(1).every(v => parseInt(v) < 50);

    overlay.innerHTML = `
      <div class="sv-modal ${isDark ? 'dark' : ''}">
        <h3 class="sv-modal-title">${isPrivate ? 'Clone Private Repository 🔒' : 'Add Skills'}</h3>
        <p class="sv-modal-desc">${description}</p>
        <div style="background: ${isDark ? '#1c2128' : '#f6f8fa'}; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; margin: 12px 0; word-break: break-all;">
          ${command}
        </div>
        <p class="sv-modal-desc" style="font-size: 12px; margin-top: 8px;">${hint}</p>
        <div class="sv-modal-buttons">
          <button class="sv-modal-btn cancel">Cancel</button>
          <button class="sv-modal-btn primary confirm">Copy Command</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Handle cancel
    overlay.querySelector('.cancel').addEventListener('click', () => {
      overlay.remove();
    });

    // Handle click outside modal
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    // Handle confirm
    overlay.querySelector('.confirm').addEventListener('click', () => {
      generateAndCopyCommand(skillPath, isPrivate);
      overlay.remove();
    });
  }

  function generateAndCopyCommand(skillPath, isPrivate) {
    const { repoInfo } = window.__skillViewerRepoInfo || {};

    if (!repoInfo) {
      showToast('Error: Repository info not available', true);
      return;
    }

    // Track collect event (skillPath indicates which skill triggered the collection)
    fetch(CONFIG.API_COLLECT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: repoInfo.full,
        skillPath: skillPath
      })
    }).catch(() => {}); // Fire and forget

    // Generate appropriate command based on repo type
    const command = isPrivate
      ? `git clone https://github.com/${repoInfo.owner}/${repoInfo.repo}.git`
      : `npx skills add ${repoInfo.owner}/${repoInfo.repo}`;

    // Copy to clipboard
    navigator.clipboard.writeText(command).then(() => {
      showToast('Command copied, paste in terminal to execute');
    }).catch(err => {
      console.error('Failed to copy:', err);
      showToast('Failed to copy command', true);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
