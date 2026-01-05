# Skill Viewer Enhancement Design

> Enhancements to the Skill Viewer Chrome extension: bug fix, draggable sidebar, multi-provider LLM support, and language configuration.

## Overview

### Features

1. **Bug Fix**: Settings page not opening from sidebar
2. **Draggable Sidebar**: Resizable width with drag handle
3. **Multi-Provider LLM**: Support Gemini, OpenAI, and Claude
4. **Language Configuration**: Separate UI language and summary language

## Feature 1: Bug Fix - Settings Page

### Problem

The settings link in the sidebar calls `chrome.runtime.openOptionsPage()` directly from content script, which may fail silently.

### Solution

Delegate to background script via message passing:

**content.js:**
```javascript
// Change from:
chrome.runtime.openOptionsPage();

// To:
chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
```

**background.js:**
```javascript
if (request.type === 'OPEN_OPTIONS') {
  chrome.runtime.openOptionsPage();
  sendResponse({ success: true });
  return true;
}
```

## Feature 2: Draggable Sidebar Width

### UI

- Resize handle on left edge of sidebar (5px wide)
- Cursor changes to `ew-resize` on hover
- Handle highlights blue when dragging

### Constraints

- Minimum width: 250px
- Maximum width: 600px
- Default width: 350px

### CSS

```css
.sv-resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  width: 5px;
  height: 100%;
  cursor: ew-resize;
  background: transparent;
}

.sv-resize-handle:hover,
.sv-resize-handle.dragging {
  background: #0969da;
}

.dark .sv-resize-handle:hover,
.dark .sv-resize-handle.dragging {
  background: #58a6ff;
}
```

### JavaScript

1. Add resize handle element to sidebar
2. Load saved width from `chrome.storage.local`
3. On mousedown: start tracking, add `.dragging` class
4. On mousemove: update sidebar width within min/max
5. On mouseup: save width to storage, remove `.dragging` class

### Storage

```javascript
{
  "sidebarWidth": 350
}
```

## Feature 3: Multi-Provider LLM Support

### Supported Providers

| Provider | Endpoint | Default Model |
|----------|----------|---------------|
| Gemini | `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | gemini-2.0-flash |
| OpenAI | `api.openai.com/v1/chat/completions` | gpt-4o-mini |
| Claude | `api.anthropic.com/v1/messages` | claude-3-haiku-20240307 |

### Storage Schema

```javascript
{
  "llmProvider": "gemini",  // Active provider
  "providers": {
    "gemini": {
      "apiKey": "AIza...",
      "model": "gemini-2.0-flash"
    },
    "openai": {
      "apiKey": "sk-...",
      "model": "gpt-4o-mini"
    },
    "claude": {
      "apiKey": "sk-ant-...",
      "model": "claude-3-haiku-20240307"
    }
  }
}
```

### Settings UI

```
┌─────────────────────────────────────┐
│ AI Provider                         │
│ ┌─────────────────────────────────┐ │
│ │ ● Gemini  ○ OpenAI  ○ Claude   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ API Key                             │
│ ┌─────────────────────────────────┐ │
│ │ ••••••••••••••                 │ │
│ └─────────────────────────────────┘ │
│ Get your key at [provider link]     │
│                                     │
│ [Test Key] [Save]                   │
└─────────────────────────────────────┘
```

### API Implementation

**background.js** will have three summarize functions:

```javascript
async function summarizeWithGemini(apiKey, model, skillName, skillContent, language) { ... }
async function summarizeWithOpenAI(apiKey, model, skillName, skillContent, language) { ... }
async function summarizeWithClaude(apiKey, model, skillName, skillContent, language) { ... }
```

Router function selects based on `llmProvider` setting.

## Feature 4: Language Configuration

### Two Separate Settings

| Setting | Purpose | Storage Key |
|---------|---------|-------------|
| UI Language | Interface text | `uiLanguage` |
| Summary Language | AI output language | `summaryLanguage` |

### Supported Languages

| Code | Name | Native Name |
|------|------|-------------|
| en | English | English |
| zh-CN | Chinese (Simplified) | 简体中文 |
| zh-TW | Chinese (Traditional) | 繁體中文 |
| ja | Japanese | 日本語 |
| ko | Korean | 한국어 |
| es | Spanish | Español |
| fr | French | Français |
| de | German | Deutsch |

### Storage Schema

```javascript
{
  "uiLanguage": "en",
  "summaryLanguage": "en"
}
```

### UI Translation

Create translations object:

```javascript
const i18n = {
  "en": {
    "title": "Claude Skills",
    "settings": "Settings",
    "scanning": "Scanning for skills...",
    "noSkills": "No Claude skills found in this repository.",
    "viewFull": "View Full Skill",
    "provider": "AI Provider",
    "apiKey": "API Key",
    "testKey": "Test Key",
    "save": "Save",
    "language": "Language",
    "uiLanguage": "Interface Language",
    "summaryLanguage": "Summary Language"
  },
  "zh-CN": {
    "title": "Claude 技能",
    "settings": "设置",
    "scanning": "正在扫描技能...",
    "noSkills": "此仓库未找到 Claude 技能。",
    "viewFull": "查看完整技能",
    "provider": "AI 提供商",
    "apiKey": "API 密钥",
    "testKey": "测试密钥",
    "save": "保存",
    "language": "语言",
    "uiLanguage": "界面语言",
    "summaryLanguage": "摘要语言"
  }
  // ... other languages
}
```

### Summary Language Prompt

Append language instruction to prompt:

```javascript
function buildPrompt(skillName, skillContent, summaryLanguage) {
  const langInstruction = summaryLanguage !== 'en'
    ? `\n\nRespond in ${getLanguageName(summaryLanguage)}.`
    : '';

  return `You are summarizing a Claude Code skill...${langInstruction}`;
}
```

### Settings UI

```
┌─────────────────────────────────────┐
│ Language Settings                   │
│                                     │
│ Interface Language / 界面语言        │
│ ┌─────────────────────────────────┐ │
│ │ 简体中文                       ▼ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Summary Language / 摘要语言          │
│ ┌─────────────────────────────────┐ │
│ │ English                       ▼ │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Updated Settings Page Layout

```
┌─────────────────────────────────────────┐
│ Skill Viewer Settings                   │
├─────────────────────────────────────────┤
│                                         │
│ ── AI Provider ──────────────────────── │
│                                         │
│ Provider                                │
│ ● Gemini  ○ OpenAI  ○ Claude           │
│                                         │
│ API Key                                 │
│ ┌─────────────────────────────────────┐ │
│ │ ••••••••••••••                     │ │
│ └─────────────────────────────────────┘ │
│ Get your key at aistudio.google.com     │
│                                         │
│ [Test Key] [Save]                       │
│ [Status message here]                   │
│                                         │
│ ── Language Settings ────────────────── │
│                                         │
│ Interface Language                      │
│ ┌─────────────────────────────────────┐ │
│ │ English                           ▼ │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Summary Language                        │
│ ┌─────────────────────────────────────┐ │
│ │ English                           ▼ │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ── Display ──────────────────────────── │
│                                         │
│ ☑ Auto-open sidebar when skills found   │
│ ☐ Dark mode                             │
│                                         │
├─────────────────────────────────────────┤
│ Skill Viewer v1.1.0                     │
└─────────────────────────────────────────┘
```

## Files to Modify

| File | Changes |
|------|---------|
| `content.js` | Add resize handle, use i18n, fix settings link |
| `sidebar.css` | Add resize handle styles |
| `background.js` | Add OpenAI/Claude APIs, OPEN_OPTIONS handler |
| `options.html` | Provider selection, language dropdowns |
| `options.js` | Multi-provider logic, language settings |
| `manifest.json` | Update version to 1.1.0, add Anthropic host permission |

## New Files

| File | Purpose |
|------|---------|
| `lib/i18n.js` | Translation strings for all languages |
| `lib/providers.js` | LLM provider configurations and API calls |
