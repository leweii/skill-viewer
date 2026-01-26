# Private Repository Skill Fetch Design

## Problem

When a GitHub repository is private, the extension cannot fetch skills via the unauthenticated GitHub API. Users with local LLM keys should still be able to view skills from their private repos.

## Solution Overview

Leverage the fact that users are already logged into GitHub and can see the repo content in their browser. When the API fails, fall back to DOM scraping for skill detection and content fetching.

## Flow

```
User visits GitHub repo page
         ↓
    Try GitHub API to get file tree
         ↓
    ┌────┴────┐
  Success     Failure (403/404)
    ↓              ↓
 Existing      Detect if private repo accessible
 flow          (can see files in DOM)
                    ↓
              Extract skill list from DOM
                    ↓
              Display skill list (no summaries yet)
                    ↓
              User clicks a skill
                    ↓
              fetch(rawUrl, { credentials: 'include' })
                    ↓
              ┌─────┴─────┐
            Success      Failure (CORS)
              ↓              ↓
           Get content   Fallback: background tab fetch
              ↓              ↓
           Call local LLM to generate summary
```

## Implementation Details

### 1. Private Repo Detection

Trigger condition:
- GitHub API returns 403 or 404
- AND page DOM contains file tree elements (user has access)

```javascript
function isPrivateRepoAccessible() {
  const hasFileTree = document.querySelector('[aria-label="Folders and files"]')
                   || document.querySelector('.js-navigation-container');
  return hasFileTree !== null;
}
```

### 2. DOM Skill List Extraction

```javascript
function extractSkillsFromDOM() {
  const links = document.querySelectorAll('a[href*="/blob/"]');
  return Array.from(links)
    .map(a => a.getAttribute('href'))
    .filter(path => path.includes('.claude/skills/') || path.includes('/skills/'));
}
```

Limitation: Only gets files visible in current directory view. If `.claude/skills/` is not visible from root, need to detect and handle.

### 3. Skill Content Fetching

**Primary: fetch with credentials**

```javascript
async function fetchPrivateSkillContent(owner, repo, branch, skillPath) {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${skillPath}`;

  try {
    const response = await fetch(rawUrl, {
      credentials: 'include',
      mode: 'cors'
    });

    if (response.ok) {
      return await response.text();
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    return await fetchViaBackgroundTab(owner, repo, branch, skillPath);
  }
}
```

**Fallback: Background tab**

```javascript
// background.js
async function fetchViaBackgroundTab(owner, repo, branch, skillPath) {
  const fileUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${skillPath}`;

  const tab = await chrome.tabs.create({ url: fileUrl, active: false });

  const content = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractSkillContentFromPage
  });

  await chrome.tabs.remove(tab.id);

  return content[0].result;
}

function extractSkillContentFromPage() {
  const codeBlock = document.querySelector('[data-code-text]');
  return codeBlock?.getAttribute('data-code-text') ||
         document.querySelector('.blob-code-content')?.textContent;
}
```

### 4. UI Changes

Sidebar states:
- Show lock icon + "Private Repo Mode" indicator
- Skill list items show name only until clicked
- Loading spinner when fetching content
- Error state if fetch fails

Cache key format for private repos:
```javascript
`summary_private_${repo}_${skill}_${lang}`
```

## Files to Modify

| File | Changes |
|------|---------|
| `content.js` | Add DOM scraping logic, private repo detection, on-demand loading UI |
| `background.js` | Add `FETCH_VIA_BACKGROUND_TAB` message handler |
| `manifest.json` | Add `scripting` and `tabs` permissions |

## New Permissions (manifest.json)

```json
{
  "permissions": [
    "scripting",
    "tabs"
  ]
}
```
