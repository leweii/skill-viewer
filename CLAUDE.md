# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Skill Viewer is a Chrome extension that displays Claude Code skills found in GitHub repositories. When visiting any GitHub repo, it shows a sidebar listing skills from `.claude/skills/` or `skills/` directories, with AI-generated summaries.

## Development Setup

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select the `extension/` folder
4. Reload the extension after making changes

There is no build step - this is vanilla JavaScript loaded directly by Chrome.

## Architecture

### Extension Components

- **content.js** - Content script injected into GitHub pages. Detects skills via GitHub API (`/git/trees`), renders the sidebar, and communicates with the background worker via `chrome.runtime.sendMessage`.

- **background.js** - Service worker handling:
  - `SUMMARIZE_SKILL` - Calls LLM APIs (Gemini/OpenAI/Claude) with caching (24h)
  - `TEST_API_KEY` - Validates API keys
  - `FETCH_SKILL_CONTENT` - Fetches raw skill files from GitHub
  - `OPEN_OPTIONS` - Opens settings page

- **options.js / options.html** - Settings page for API keys, language preferences, and display options

### Key Patterns

**Multi-provider LLM support**: Three providers (Gemini, OpenAI, Claude) share the same prompt structure via `buildPrompt()`. Each has a dedicated `summarizeWith*()` function. Provider config is defined in `PROVIDERS` objects (duplicated in background.js and lib/providers.js).

**i18n**: UI strings for 8 languages defined in `lib/i18n.js`. The `t(key, lang)` function returns translated strings. Summaries can be generated in any supported language via prompt instruction.

**GitHub SPA handling**: content.js uses multiple detection methods for navigation: `turbo:load`, `pjax:end` events, and a MutationObserver fallback watching for URL changes.

**Skill collection**: The "Collect" button generates `npx degit` commands to copy skills to local directories (`~/.claude/skills/` or `./.claude/skills/`).

### Storage Schema (chrome.storage.local)

```javascript
{
  llmProvider: 'gemini' | 'openai' | 'claude',
  providers: {
    [provider]: { apiKey: string, model?: string }
  },
  uiLanguage: 'en' | 'zh-CN' | 'zh-TW' | 'ja' | 'ko' | 'es' | 'fr' | 'de',
  summaryLanguage: string,  // same codes as uiLanguage
  autoOpen: boolean,
  darkMode: boolean,
  sidebarWidth: number,     // 250-600px
  summary_${repo}_${skill}_${lang}: { summary: string, timestamp: number }
}
```
