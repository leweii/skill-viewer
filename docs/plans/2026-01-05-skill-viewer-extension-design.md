# Skill Viewer Chrome Extension Design

> A Chrome extension that auto-detects Claude skills on GitHub pages and shows AI-powered summaries in a sidebar panel.

## Overview

### Problem
When browsing GitHub repositories with Claude skills, there's no quick way to understand what each skill does without opening and reading each file.

### Solution
A browser extension that:
- Auto-detects `.claude/skills/` or `skills/` directories on GitHub
- Shows a sidebar with all discovered skills
- Displays AI summaries (via Gemini) or raw SKILL.md content
- Works without API key (shows raw content as fallback)

## Architecture

### Tech Stack
- **Manifest V3** Chrome Extension
- **Vanilla JavaScript** (no build tools)
- **Gemini 2.0 Flash** for summarization
- **chrome.storage** for settings and cache

### File Structure

```
skill-viewer-extension/
├── manifest.json          # Extension config (Manifest V3)
├── content.js             # Injected into GitHub pages
├── sidebar.html           # Sidebar UI
├── sidebar.css            # Sidebar styles
├── background.js          # Service worker for API calls
├── options.html           # Settings page for API key
├── options.js             # Settings logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── lib/
    └── gemini.js          # Gemini API client
```

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  content.js  │────▶│ background.js│────▶│  Gemini API  │
│  (GitHub)    │◀────│ (Service Wkr)│◀────│              │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │                    ▼
       │             ┌──────────────┐
       │             │chrome.storage│
       │             │ - API key    │
       │             │ - Summaries  │
       │             │ - Settings   │
       └────────────▶│              │
                     └──────────────┘
```

## UI Design

### Sidebar Layout

```
┌─────────────────────────────────┐
│ ✕  Claude Skills (3 found)      │  ← Header with close button
├─────────────────────────────────┤
│ ▼ brainstorming                 │  ← Skill name (collapsible)
│ ┌─────────────────────────────┐ │
│ │ Helps turn ideas into fully │ │  ← Summary (from Gemini)
│ │ formed designs through      │ │     OR raw SKILL.md if no key
│ │ collaborative dialogue...   │ │
│ │                             │ │
│ │ [View Full Skill]           │ │  ← Link to GitHub file
│ └─────────────────────────────┘ │
│                                 │
│ ▶ debugging                     │  ← Collapsed skill
│ ▶ test-driven-development       │
├─────────────────────────────────┤
│ ⚙️ Settings                      │  ← Footer
└─────────────────────────────────┘
```

### States

| State | What Shows |
|-------|------------|
| Loading | Spinner + "Scanning for skills..." |
| No skills found | "No Claude skills in this repository" |
| No API key | Raw SKILL.md content (markdown rendered) |
| With API key | AI summary + option to view full content |
| API error | Fallback to raw content + error toast |

### Behavior

- Sidebar auto-opens when skills detected
- User can close with ✕ button
- Remembers open/closed state per session
- Skills expanded by default (first 2), rest collapsed
- Smooth slide-in animation from right

## Settings Page

```
┌─────────────────────────────────────────┐
│ Skill Viewer Settings                   │
├─────────────────────────────────────────┤
│                                         │
│ Gemini API Key                          │
│ ┌─────────────────────────────────────┐ │
│ │ ••••••••••••••••••••               │ │
│ └─────────────────────────────────────┘ │
│ Get your key at aistudio.google.com     │
│                                         │
│ [Test Key]  [Save]                      │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ ☑ Auto-open sidebar when skills found   │
│ ☐ Dark mode                             │
│                                         │
└─────────────────────────────────────────┘
```

### Storage Schema

```javascript
{
  "geminiApiKey": "AIza...",
  "autoOpen": true,
  "darkMode": false,
  "summaryCache": {
    "user/repo/skill-name": {
      "summary": "This skill helps...",
      "timestamp": 1704067200000
    }
  }
}
```

## Gemini Integration

### API Endpoint

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}
```

### Summarization Prompt

```
You are summarizing a Claude Code skill for developers browsing GitHub.

Skill name: {{skillName}}
Skill content:
---
{{skillContent}}
---

Provide a concise summary (2-3 sentences) that answers:
1. What does this skill do?
2. When should a developer use it?

Keep it practical and scannable. No markdown formatting.
```

### Error Handling

| Error | Behavior |
|-------|----------|
| Invalid API key | Show raw SKILL.md + toast "Invalid API key" |
| Rate limited | Show raw SKILL.md + toast "Rate limited, showing raw content" |
| Network error | Show raw SKILL.md + toast "Offline, showing raw content" |
| Empty response | Show raw SKILL.md |

### Model Choice

Using **gemini-2.0-flash** because:
- Fast responses (good for UX)
- Cheap (won't burn through quota)
- Sufficient quality for short summaries

## GitHub Detection

### URL Matching

```json
"content_scripts": [{
  "matches": [
    "https://github.com/*/*",
    "https://github.com/*/*/tree/*"
  ]
}]
```

### Detection Logic

1. Extract owner/repo from URL
2. Fetch repo tree via GitHub API (unauthenticated)
3. Filter for `.claude/skills/` or `skills/` directories
4. Find SKILL.md files within each skill folder

### SPA Navigation Handling

GitHub uses client-side navigation. Handle with:
- `turbo:load` event listener
- MutationObserver for URL changes

## Key Design Decisions

1. **Eager summarization**: Load all summaries immediately when skills detected
2. **Graceful fallback**: No API key shows raw SKILL.md content (still useful)
3. **Cache summaries**: Store in chrome.storage.local to avoid re-summarizing
4. **No GitHub token required**: Unauthenticated API (60 req/hr is enough)
5. **API calls via background.js**: Avoids CORS, keeps API key secure

## Out of Scope (v1)

- Firefox support
- Editing/installing skills
- GitHub token for higher rate limits
- Skill comparison
