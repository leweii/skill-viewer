# Skill Viewer

<p align="center">
  <img src="extension/icons/icon128.png" alt="Skill Viewer Logo" width="128" height="128">
</p>

<p align="center">
  <strong>View and summarize Claude Code skills on GitHub</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#supported-languages">Languages</a>
</p>

---

## Features

- **Auto-Detection** - Automatically finds Claude skills in `.claude/skills/` or `skills/` directories
- **AI Summaries** - Get concise 2-3 sentence summaries of what each skill does
- **Cloud Service** - Use our cloud API for summaries without needing your own API keys
- **Multi-Provider LLM** - Or use your own Gemini, OpenAI, or Claude API keys
- **Draggable Sidebar** - Resize the sidebar width (250-600px) to your preference
- **8 Languages** - UI and summaries available in English, 简体中文, 繁體中文, 日本語, 한국어, Español, Français, Deutsch
- **Dark Mode** - Matches your preference
- **SPA Support** - Works seamlessly with GitHub's single-page navigation

## Installation

### From Chrome Web Store
*Coming soon*

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `extension` folder

## Usage

1. Visit any GitHub repository that contains Claude Code skills
2. The sidebar automatically appears on the right side
3. Click on any skill to expand/collapse its summary
4. Drag the left edge to resize the sidebar

## Configuration

Click the **Settings** link in the sidebar footer or the extension icon to configure:

### AI Provider
Choose your preferred LLM provider:
| Provider | Model | Get API Key |
|----------|-------|-------------|
| Gemini | gemini-2.0-flash | [aistudio.google.com](https://aistudio.google.com/apikey) |
| OpenAI | gpt-4o-mini | [platform.openai.com](https://platform.openai.com/api-keys) |
| Claude | claude-3-haiku | [console.anthropic.com](https://console.anthropic.com/settings/keys) |

### Language Settings
- **Interface Language** - Language for UI elements
- **Summary Language** - Language for AI-generated summaries

### Display Options
- Auto-open sidebar when skills are found
- Dark mode

## Cloud Service

Skill Viewer offers a cloud service for AI-powered summaries without needing your own API keys.

### Plans

| Plan | Daily Limit | Price |
|------|-------------|-------|
| Free | 5 summaries | $0 |
| Pro | 50 summaries | $9.99 (one-time) |

- Cache hits don't count against your quota
- Summaries are cached for 7 days per language
- Pro access is lifetime with daily limits

### How It Works

1. **Login** with GitHub or Google in the Settings page
2. **Use** the extension normally - cloud summaries are automatic
3. **Upgrade** to Pro if you need more daily summaries

### Fallback

If you've configured your own API keys, the extension will automatically fall back to them when:
- You're not logged in to the cloud service
- Your daily quota is exceeded
- The cloud service is unavailable

## Supported Languages

| Language | UI | Summaries |
|----------|:--:|:---------:|
| English | ✓ | ✓ |
| 简体中文 (Simplified Chinese) | ✓ | ✓ |
| 繁體中文 (Traditional Chinese) | ✓ | ✓ |
| 日本語 (Japanese) | ✓ | ✓ |
| 한국어 (Korean) | ✓ | ✓ |
| Español (Spanish) | ✓ | ✓ |
| Français (French) | ✓ | ✓ |
| Deutsch (German) | ✓ | ✓ |

## Privacy

- **Local storage** - API keys and settings stored in your browser
- **Cloud service** - If you use our cloud service, skill content is sent to our servers for summarization
- **No tracking** - We don't track your browsing or collect personal data
- **Usage stats** - We track anonymized view/collect counts for popular skills

## Development

```bash
# Clone the repository
git clone https://github.com/leweii/skill-viewer.git

# Load in Chrome
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Load unpacked -> select extension folder
```

## License

MIT

---

<p align="center">
  Built for <a href="https://github.com/anthropics/claude-code">Claude Code</a>
</p>
