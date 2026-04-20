# Auto-Load Toggle Design

**Date:** 2026-03-30
**Status:** Approved

## Overview

Add a configurable toggle to control whether the Skill Viewer extension automatically scans and displays skills when visiting a GitHub repository page. When disabled (default), the extension does nothing until the user explicitly clicks the toolbar icon.

## Motivation

Some users prefer the extension to be passive — only activating on demand — rather than automatically scanning every GitHub page they visit.

## Storage

Add one new key to `chrome.storage.local`:

```javascript
autoLoad: boolean  // default: false
```

This replaces the implicit "always run" behavior. The existing `autoOpen` setting remains unchanged (it controls sidebar auto-expand when skills are found).

## Behavior

### autoLoad = false (default)
- `content.js` reads the flag on startup and exits immediately
- No GitHub API calls, no DOM changes, no scanning
- Clicking the toolbar icon sends an `ACTIVATE` message to content.js, which then runs the full init flow (scan + show sidebar)
- The sidebar renders and the icon click experience is identical to the current behavior

### autoLoad = true
- Extension behaves exactly as it does today: scans on every page load, auto-opens sidebar if skills are found (subject to the `autoOpen` setting)

## Components

### content.js
- On `init()`: read `autoLoad` from storage; if `false`, return early
- Add message listener for `{ type: 'ACTIVATE' }`: runs the full init flow regardless of `autoLoad`
- Guard against double-init with existing `window.__skillViewerLoaded` check

### background.js
- `chrome.action.onClicked`: currently toggles sidebar visibility. Change to send `ACTIVATE` message to the active tab's content script instead

### Options page (options.html / options.js)
- Add checkbox in the Display Settings section: **自动加载 / Auto-load** (default unchecked)
- Reads/writes `autoLoad` key in storage
- Label: "打开页面时自动扫描技能 / Auto-scan for skills when opening a page"

### Sidebar UI (content.js)
- Add a small icon button in the sidebar header toolbar (next to existing controls)
- Icon: use a suitable indicator (e.g., a flash/bolt symbol) to represent auto-load state
- Active state (autoLoad = true): button highlighted
- Inactive state (autoLoad = false): button dimmed
- On click: toggle `autoLoad` in storage only — no reload, no hide/show, no other side effects
- Button tooltip: "自动加载 / Auto-load"

## Data Flow

```
User visits GitHub page
  → content.js init()
  → read autoLoad
    → false: exit (nothing happens)
    → true: full scan + render sidebar

User clicks toolbar icon
  → background.js onClicked
  → sendMessage({ type: 'ACTIVATE' }) to current tab
  → content.js receives ACTIVATE
  → if not yet initialized: runs full init (scan + render sidebar)
  → if already initialized: toggles sidebar visibility (show/hide)

User clicks sidebar toggle button
  → read current autoLoad value
  → write !autoLoad to storage
  → update button visual state only
```

## Out of Scope

- No per-repo or per-domain granularity
- No automatic re-scan when `autoLoad` is toggled on in the sidebar (user must reload or click icon)
- No changes to summary caching, language settings, or provider config
