# Markdown Summary Rendering Design

## Overview

Update the Skill Viewer extension to render skill summaries in markdown format with capability badges that highlight potentially risky operations.

## Requirements

1. Display capability badges at the top of each summary:
   - `⚠️ Code Execution` - skill runs code/commands (warning style)
   - `⚠️ External Access` - skill accesses external services/APIs (warning style)
   - `📁 File Operations` - skill reads/writes files (info style)

2. Render summary description in markdown format

3. Support dark mode for all new styles

## Design

### Prompt Changes (background.js)

Update `buildPrompt()` to request structured markdown output:

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

Analyze the skill and provide a summary in this exact markdown format:

**Line 1 - Capability badges (only include applicable ones, separated by |):**
- ⚠️ Code Execution - if skill runs bash commands, scripts, or executes code
- ⚠️ External Access - if skill calls external APIs, fetches URLs, or accesses network
- 📁 File Operations - if skill reads, writes, or modifies files

**Line 2+ - Description (2-3 sentences):**
What does this skill do and when should a developer use it?

Example output:
⚠️ Code Execution | ⚠️ External Access

Automates git commit workflows with AI-generated messages. Use when you want consistent, descriptive commits without manual message writing.${langInstruction}`;
}
```

Increase `maxOutputTokens` from 200 to 400.

### Markdown Rendering (content.js)

1. Add `marked.min.js` library (~40KB) to `extension/lib/`
2. Load via manifest.json content scripts
3. Replace `escapeHtml(summary)` with markdown parsing:

```javascript
function renderSummary(summaryText) {
  // Parse first line as badges
  const lines = summaryText.trim().split('\n');
  const firstLine = lines[0];
  const description = lines.slice(1).join('\n').trim();

  // Check if first line contains badges
  const hasBadges = firstLine.includes('⚠️') || firstLine.includes('📁');

  let html = '';
  if (hasBadges) {
    const badges = firstLine.split('|').map(b => b.trim());
    html += '<div class="sv-badges">';
    for (const badge of badges) {
      const isWarning = badge.includes('⚠️');
      const className = isWarning ? 'sv-badge-warning' : 'sv-badge-info';
      html += `<span class="${className}">${escapeHtml(badge)}</span>`;
    }
    html += '</div>';
  }

  // Render description as markdown
  const content = hasBadges ? description : summaryText;
  html += marked.parse(content);

  return html;
}
```

### CSS Styles (content.css)

```css
/* Badge container */
.sv-summary .sv-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

/* Warning badges (Code Execution, External Access) */
.sv-badge-warning {
  background: #fff3cd;
  color: #856404;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid #ffc107;
  white-space: nowrap;
}

/* Info badges (File Operations) */
.sv-badge-info {
  background: #e7f1ff;
  color: #0056b3;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid #b8daff;
  white-space: nowrap;
}

/* Dark mode */
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

/* Markdown content */
.sv-summary p {
  margin: 0 0 8px;
  line-height: 1.4;
}

.sv-summary p:last-child {
  margin-bottom: 0;
}

.sv-summary code {
  background: #f1f1f1;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
}

#skill-viewer-sidebar.dark .sv-summary code {
  background: #2d2d2d;
}
```

## Files to Change

| File | Change |
|------|--------|
| `extension/background.js` | Update `buildPrompt()`, increase `maxOutputTokens` to 400 |
| `extension/content.js` | Add `renderSummary()` function, use marked for markdown |
| `extension/content.css` | Add badge styles and markdown element styles |
| `extension/lib/marked.min.js` | Add new file (download from jsDelivr CDN) |
| `extension/manifest.json` | Add `lib/marked.min.js` to content scripts |

## Cache Strategy

Let existing cached summaries expire naturally (24h TTL). Users will receive new format summaries within a day without requiring manual cache clearing.

## Testing

1. Load extension in Chrome developer mode
2. Visit a GitHub repo with Claude skills (e.g., this repo)
3. Verify badges display correctly for skills with code execution, external access, file operations
4. Verify markdown renders properly (bold, code, paragraphs)
5. Test dark mode styling
6. Test non-English summary languages
