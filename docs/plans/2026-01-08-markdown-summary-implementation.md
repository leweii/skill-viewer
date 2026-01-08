# Markdown Summary Rendering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update skill summaries to render markdown with capability badges highlighting risky operations.

**Architecture:** Modify the LLM prompt to output structured format (badges + description), add marked.js library for markdown parsing, update CSS for badge styling.

**Tech Stack:** Vanilla JavaScript, marked.js library, Chrome Extension Manifest V3

---

### Task 1: Add marked.js Library

**Files:**
- Create: `extension/lib/marked.min.js`

**Step 1: Download marked.min.js**

Run:
```bash
curl -o extension/lib/marked.min.js https://cdn.jsdelivr.net/npm/marked@15.0.6/marked.min.js
```

**Step 2: Verify file exists**

Run:
```bash
ls -la extension/lib/marked.min.js
```

Expected: File exists, ~40KB

**Step 3: Commit**

```bash
git add extension/lib/marked.min.js
git commit -m "chore: add marked.js library for markdown rendering"
```

---

### Task 2: Update manifest.json to Load marked.js

**Files:**
- Modify: `extension/manifest.json:21-28`

**Step 1: Update content_scripts to include marked.js**

Change the content_scripts section from:

```json
  "content_scripts": [
    {
      "matches": ["https://github.com/*/*"],
      "js": ["content.js"],
      "css": ["sidebar.css"],
      "run_at": "document_idle"
    }
  ],
```

To:

```json
  "content_scripts": [
    {
      "matches": ["https://github.com/*/*"],
      "js": ["lib/marked.min.js", "content.js"],
      "css": ["sidebar.css"],
      "run_at": "document_idle"
    }
  ],
```

**Step 2: Commit**

```bash
git add extension/manifest.json
git commit -m "chore: load marked.js in content scripts"
```

---

### Task 3: Update Prompt in background.js

**Files:**
- Modify: `extension/background.js:37-55`

**Step 1: Replace buildPrompt function**

Replace the existing `buildPrompt` function with:

```javascript
function buildPrompt(skillName, skillContent, summaryLanguage) {
  const langInstruction = summaryLanguage && summaryLanguage !== 'en'
    ? `\n\nRespond in ${getLanguageName(summaryLanguage)}.`
    : '';

  return `You are summarizing a Claude Code skill for developers browsing GitHub.

Skill name: ${skillName}
Skill content:
---
${skillContent}
---

Analyze the skill and provide a summary in this exact format:

**Line 1 - Capability badges (only include ones that apply, separated by " | "):**
- ⚠️ Code Execution - if the skill runs bash commands, scripts, or executes code
- ⚠️ External Access - if the skill calls external APIs, fetches URLs, or accesses network resources
- 📁 File Operations - if the skill reads, writes, or modifies files

**Line 2+ - Description (2-3 sentences):**
What does this skill do and when should a developer use it? Keep it practical and scannable.

Example output format:
⚠️ Code Execution | 📁 File Operations

Automates git commit workflows with AI-generated messages. Use when you want consistent, descriptive commits without writing messages manually.${langInstruction}`;
}
```

**Step 2: Update maxOutputTokens from 200 to 400**

In `summarizeWithGemini` (around line 68-71), change:

```javascript
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200
      }
```

To:

```javascript
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 400
      }
```

In `summarizeWithOpenAI` (around line 104), change:

```javascript
      max_tokens: 200
```

To:

```javascript
      max_tokens: 400
```

In `summarizeWithClaude` (around line 131), change:

```javascript
      max_tokens: 200,
```

To:

```javascript
      max_tokens: 400,
```

**Step 3: Commit**

```bash
git add extension/background.js
git commit -m "feat: update prompt for structured summary with capability badges"
```

---

### Task 4: Add renderSummary Function in content.js

**Files:**
- Modify: `extension/content.js:374-390`

**Step 1: Replace renderBasicMarkdown with renderSummary**

Replace the existing `renderBasicMarkdown` function with:

```javascript
  function renderSummary(summaryText) {
    const lines = summaryText.trim().split('\n');
    const firstLine = lines[0] || '';

    // Check if first line contains capability badges
    const hasBadges = firstLine.includes('⚠️') || firstLine.includes('📁');

    let html = '';

    if (hasBadges) {
      // Parse badges from first line
      const badges = firstLine.split('|').map(b => b.trim()).filter(b => b);
      html += '<div class="sv-badges">';
      for (const badge of badges) {
        const isWarning = badge.includes('⚠️');
        const className = isWarning ? 'sv-badge sv-badge-warning' : 'sv-badge sv-badge-info';
        html += `<span class="${className}">${escapeHtml(badge)}</span>`;
      }
      html += '</div>';

      // Rest is description
      const description = lines.slice(1).join('\n').trim();
      if (description) {
        html += '<div class="sv-description">' + marked.parse(description) + '</div>';
      }
    } else {
      // No badges, render entire text as markdown
      html += '<div class="sv-description">' + marked.parse(summaryText) + '</div>';
    }

    return html;
  }

  function renderBasicMarkdown(text) {
    // Keep for fallback raw content rendering
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }
```

**Step 2: Update summary rendering to use renderSummary**

Around line 349, change:

```javascript
          skillEl.innerHTML = `
            <div class="sv-summary">${escapeHtml(summaryResponse.summary)}</div>
            <a href="${githubUrl}" target="_blank" class="sv-view-link">View Full Skill →</a>
          `;
```

To:

```javascript
          skillEl.innerHTML = `
            <div class="sv-summary">${renderSummary(summaryResponse.summary)}</div>
            <a href="${githubUrl}" target="_blank" class="sv-view-link">View Full Skill →</a>
          `;
```

**Step 3: Commit**

```bash
git add extension/content.js
git commit -m "feat: add renderSummary function with badge parsing and markdown rendering"
```

---

### Task 5: Add Badge Styles to sidebar.css

**Files:**
- Modify: `extension/sidebar.css` (append to end)

**Step 1: Add badge and markdown styles**

Append the following to the end of `sidebar.css`:

```css
/* Capability badges */
.sv-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.sv-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.sv-badge-warning {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffc107;
}

.sv-badge-info {
  background: #e7f1ff;
  color: #0056b3;
  border: 1px solid #b8daff;
}

/* Dark mode badges */
#skill-viewer-sidebar.dark .sv-badge-warning {
  background: #3d3200;
  color: #ffc107;
  border-color: #665200;
}

#skill-viewer-sidebar.dark .sv-badge-info {
  background: #1a3a5c;
  color: #6cb2ff;
  border-color: #2d5a87;
}

/* Summary description markdown */
.sv-description {
  line-height: 1.5;
}

.sv-description p {
  margin: 0 0 8px;
}

.sv-description p:last-child {
  margin-bottom: 0;
}

.sv-description code {
  background: #f1f1f1;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}

.sv-description strong {
  font-weight: 600;
}

#skill-viewer-sidebar.dark .sv-description code {
  background: #30363d;
}
```

**Step 2: Commit**

```bash
git add extension/sidebar.css
git commit -m "feat: add styles for capability badges and markdown content"
```

---

### Task 6: Manual Testing

**Step 1: Reload extension**

1. Open `chrome://extensions`
2. Find "Skill Viewer" and click the reload icon
3. If errors appear, check the console

**Step 2: Test on a repo with skills**

1. Visit https://github.com/anthropics/claude-code (or any repo with `.claude/skills/`)
2. Verify sidebar opens
3. Check that summaries show badges (⚠️ Code Execution, ⚠️ External Access, 📁 File Operations)
4. Verify badges have correct colors (yellow for warning, blue for info)
5. Verify description renders as markdown (bold text, code snippets)

**Step 3: Test dark mode**

1. Open Settings, enable dark mode
2. Verify badge colors adapt correctly
3. Verify markdown content is readable

**Step 4: Test without API key**

1. Remove API key from settings
2. Verify fallback raw content still renders properly

---

### Task 7: Final Commit and Version Bump

**Step 1: Bump version in manifest.json**

Change version from `"1.1.1"` to `"1.2.0"`.

**Step 2: Commit version bump**

```bash
git add extension/manifest.json
git commit -m "chore: bump version to 1.2.0"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `extension/lib/marked.min.js` | New file - markdown parsing library |
| `extension/manifest.json` | Load marked.js, bump version |
| `extension/background.js` | New prompt format, increase token limit |
| `extension/content.js` | Add renderSummary() with badge parsing |
| `extension/sidebar.css` | Badge styles and markdown styles |
