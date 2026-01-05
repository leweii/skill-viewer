# Chrome Web Store Submission Guide

## Prerequisites

1. **Google Developer Account** - Register at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. **One-time fee**: $5 USD registration fee

## Assets Ready

### Icons (in `extension/icons/`)
- `icon16.png` - 16x16 favicon
- `icon48.png` - 48x48 management page
- `icon128.png` - 128x128 store listing

### Promotional Images (in `extension/store/`)
- `promo-440x280.png` - Small promotional tile (required)

### Screenshots Needed
Take screenshots at **1280x800** or **640x400** showing:
1. Sidebar on a GitHub repo with skills detected
2. Settings page with provider selection
3. Sidebar with AI-generated summaries
4. Language settings in action

## Store Listing Information

### Extension Name
```
Skill Viewer - Claude Code Skills Browser
```

### Short Description (132 chars max)
```
View and summarize Claude Code skills on GitHub. AI-powered summaries with Gemini, OpenAI, or Claude.
```

### Detailed Description
```
Skill Viewer automatically detects and displays Claude Code skills when you browse GitHub repositories.

FEATURES:
- Auto-detect skills in .claude/skills/ or skills/ directories
- AI-powered skill summaries using your choice of LLM
- Support for Gemini, OpenAI, and Claude APIs
- Draggable sidebar with persistent width
- 8 languages: English, Chinese (Simplified/Traditional), Japanese, Korean, Spanish, French, German
- Separate UI and summary language settings
- Dark mode support
- Works with GitHub's single-page navigation

HOW IT WORKS:
1. Install the extension
2. Open Settings and add your API key (Gemini, OpenAI, or Claude)
3. Visit any GitHub repository with Claude skills
4. The sidebar appears automatically with skill summaries

PRIVACY:
- No data collection
- API keys stored locally in your browser
- Only communicates with GitHub API and your chosen LLM provider

PERMISSIONS EXPLAINED:
- Storage: Save your settings and cached summaries
- Host permissions: Access GitHub pages and LLM APIs
```

### Category
```
Developer Tools
```

### Language
```
English (default), with UI support for 8 languages
```

## Submission Steps

1. **Create ZIP file**:
   ```bash
   cd extension
   zip -r ../skill-viewer.zip . -x "*.DS_Store" -x "store/*" -x "*.svg"
   ```

2. **Go to Developer Dashboard**:
   https://chrome.google.com/webstore/devconsole

3. **Click "New Item"** and upload `skill-viewer.zip`

4. **Fill in Store Listing**:
   - Upload promotional image (440x280)
   - Upload at least 1 screenshot
   - Fill in name, descriptions
   - Select category: Developer Tools
   - Select language

5. **Privacy Tab**:
   - Single purpose: "Display Claude Code skills from GitHub repositories"
   - Permissions justification:
     - `storage`: Store user preferences and cache summaries
     - `activeTab`: Access current GitHub page
     - Host permissions: Fetch from GitHub API and LLM providers

6. **Submit for Review**

## Review Timeline
- Typically 1-3 business days
- May take longer for first submission

## Post-Submission

After approval, your extension will be available at:
```
https://chrome.google.com/webstore/detail/skill-viewer/[YOUR-EXTENSION-ID]
```

## Updates

To publish updates:
1. Increment version in `manifest.json`
2. Create new ZIP
3. Upload to dashboard
4. Submit for review
