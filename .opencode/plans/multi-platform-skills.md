# Multi-Platform AI Skills Support

## Summary

Add support for multiple AI coding platforms (Claude, Gemini, OpenCode, Codex, Cursor) instead of only Claude. This involves:

1. Renaming "Claude Skills" to "AI Skills" everywhere
2. Expanding skill scan paths to detect skills from all platforms
3. Adding a "Default Platform" setting in the options page
4. Updating private repo hint text to be platform-agnostic
5. Updating tests and documentation

## Changes Required

### File: `extension/content.js`

#### Change 1: Title rename (3 locations)

**Line 380** - Initial sidebar HTML:
```
OLD: <h2>Claude Skills</h2>
NEW: <h2>AI Skills</h2>
```

**Line 504** - Private repo header:
```
OLD: sidebarEl.querySelector('.sv-header h2').textContent = 'Claude Skills 🔒';
NEW: sidebarEl.querySelector('.sv-header h2').textContent = 'AI Skills 🔒';
```

**Lines 525-527** - Skills list header with count:
```
OLD:
    const headerText = isPrivateRepo
      ? `Claude Skills (${skills.length}) 🔒`
      : `Claude Skills (${skills.length})`;

NEW:
    const headerText = isPrivateRepo
      ? `AI Skills (${skills.length}) 🔒`
      : `AI Skills (${skills.length})`;
```

#### Change 2: Expand skillPatterns (line 287)

```
OLD: const skillPatterns = ['.claude/skills/', 'skills/'];

NEW: const skillPatterns = ['.claude/skills/', '.gemini/skills/', '.opencode/skills/', '.codex/skills/', '.cursor/skills/', 'skills/'];
```

#### Change 3: Update extractSkillsFromDOM (lines 83-89)

```
OLD:
      let skillDir = null;
      if (filePath.includes('.claude/skills/')) {
        skillDir = '.claude/skills/';
      } else if (filePath.includes('skills/')) {
        skillDir = 'skills/';
      }

NEW:
      let skillDir = null;
      const skillDirPatterns = ['.claude/skills/', '.gemini/skills/', '.opencode/skills/', '.codex/skills/', '.cursor/skills/', 'skills/'];
      for (const pattern of skillDirPatterns) {
        if (filePath.includes(pattern)) {
          skillDir = pattern;
          break;
        }
      }
```

#### Change 4: Update detectPotentialSkillsDirs (lines 127-134)

```
OLD:
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      // Match .claude folder or skills folder at root
      if (href.match(/\/tree\/[^/]+\/\.claude$/)) {
        potentialDirs.push('.claude/skills');
      } else if (href.match(/\/tree\/[^/]+\/skills$/)) {
        potentialDirs.push('skills');
      }
    }

NEW:
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
```

#### Change 5: Update private repo hint text (line 760)

```
OLD: ? 'After cloning, you can manually copy skills from the .claude/skills/ or skills/ directory.'

NEW: ? 'After cloning, you can manually copy skills from the skills directory (e.g. .claude/skills/, .opencode/skills/).'
```

---

### File: `extension/lib/i18n.js`

#### Change 1: Update title translations (8 languages)

```
en:    "title": "AI Skills"
zh-CN: "title": "AI 技能"
zh-TW: "title": "AI 技能"
ja:    "title": "AI スキル"
ko:    "title": "AI 스킬"
es:    "title": "Habilidades AI"
fr:    "title": "Competences AI"
de:    "title": "AI Fahigkeiten"
```

#### Change 2: Update noSkills translations

```
en:    "noSkills": "No AI skills found in this repository."
zh-CN: "noSkills": "此仓库未找到 AI 技能。"
zh-TW: "noSkills": "此倉庫未找到 AI 技能。"
ja:    "noSkills": "このリポジトリにAIスキルは見つかりませんでした。"
ko:    "noSkills": "이 저장소에서 AI 스킬을 찾을 수 없습니다."
es:    "noSkills": "No se encontraron habilidades AI en este repositorio."
fr:    "noSkills": "Aucune competence AI trouvee dans ce depot."
de:    "noSkills": "Keine AI-Fahigkeiten in diesem Repository gefunden."
```

#### Change 3: Add defaultPlatform translation key (after "darkMode" in each language)

```
en:    "defaultPlatform": "Default Platform"
zh-CN: "defaultPlatform": "默认平台"
zh-TW: "defaultPlatform": "預設平台"
ja:    "defaultPlatform": "デフォルトプラットフォーム"
ko:    "defaultPlatform": "기본 플랫폼"
es:    "defaultPlatform": "Plataforma predeterminada"
fr:    "defaultPlatform": "Plateforme par defaut"
de:    "defaultPlatform": "Standard-Plattform"
```

---

### File: `extension/options.html`

#### Change 1: Add Default Platform dropdown in Display section (after dark-mode checkbox, before closing `</div>` of Display section around line 575)

Insert after line 575 (`</div>` of dark-mode checkbox-item):

```html
      <div style="margin-top: 12px;">
        <label for="default-platform" id="label-default-platform">Default Platform</label>
        <select id="default-platform">
          <option value="claude">Claude</option>
          <option value="gemini">Gemini</option>
          <option value="opencode">OpenCode</option>
          <option value="codex">Codex</option>
          <option value="cursor">Cursor</option>
        </select>
      </div>
```

---

### File: `extension/options.js`

#### Change 1: Add defaultPlatform to init() settings load (line 535-544)

Add `'defaultPlatform'` to the `chrome.storage.local.get()` array.

```
OLD:
  const settings = await chrome.storage.local.get([
    'llmProvider',
    'providers',
    'uiLanguage',
    'summaryLanguage',
    'autoOpen',
    'darkMode',
    // Legacy
    'geminiApiKey'
  ]);

NEW:
  const settings = await chrome.storage.local.get([
    'llmProvider',
    'providers',
    'uiLanguage',
    'summaryLanguage',
    'autoOpen',
    'darkMode',
    'defaultPlatform',
    // Legacy
    'geminiApiKey'
  ]);
```

#### Change 2: Set default-platform value in init() (after line 567)

Add after `document.getElementById('dark-mode').checked = settings.darkMode === true;`:

```javascript
  // Set default platform
  document.getElementById('default-platform').value = settings.defaultPlatform || 'claude';
```

#### Change 3: Add defaultPlatform to saveCheckboxes() (line 682-686)

```
OLD:
async function saveCheckboxes() {
  const autoOpen = document.getElementById('auto-open').checked;
  const darkMode = document.getElementById('dark-mode').checked;
  await chrome.storage.local.set({ autoOpen, darkMode });
}

NEW:
async function saveCheckboxes() {
  const autoOpen = document.getElementById('auto-open').checked;
  const darkMode = document.getElementById('dark-mode').checked;
  const defaultPlatform = document.getElementById('default-platform').value;
  await chrome.storage.local.set({ autoOpen, darkMode, defaultPlatform });
}
```

#### Change 4: Bind change event for default-platform in init() (after line 581)

Add after `document.getElementById('dark-mode').addEventListener('change', saveCheckboxes);`:

```javascript
  document.getElementById('default-platform').addEventListener('change', saveCheckboxes);
```

#### Change 5: Add defaultPlatform to i18n inline translations

Add after `"darkMode"` key in each language block:

```
en:    "defaultPlatform": "Default Platform"
zh-CN: "defaultPlatform": "默认平台"
zh-TW: "defaultPlatform": "預設平台"
ja:    "defaultPlatform": "デフォルトプラットフォーム"
ko:    "defaultPlatform": "기본 플랫폼"
es:    "defaultPlatform": "Plataforma predeterminada"
fr:    "defaultPlatform": "Plateforme par defaut"
de:    "defaultPlatform": "Standard-Plattform"
```

#### Change 6: Add label update in updateUI() (after line 523)

Add after `document.getElementById('label-dark-mode').textContent = t('darkMode');`:

```javascript
  document.getElementById('label-default-platform').textContent = t('defaultPlatform');
```

---

### File: `extension/content.test.js`

#### Change 1: Update parseSkillsFromTree skillPatterns (line 8)

```
OLD: const skillPatterns = ['.claude/skills/', 'skills/'];

NEW: const skillPatterns = ['.claude/skills/', '.gemini/skills/', '.opencode/skills/', '.codex/skills/', '.cursor/skills/', 'skills/'];
```

#### Change 2: Add new platform tests (after existing tests, before Summary)

```javascript
test('detects skill at .opencode/skills/skill-name/SKILL.md', () => {
  const tree = [
    { type: 'blob', path: '.opencode/skills/my-opencode-skill/SKILL.md' }
  ];
  const skills = parseSkillsFromTree(tree);

  assertEqual(skills.length, 1, 'Should find 1 skill');
  assertEqual(skills[0].name, 'my-opencode-skill');
  assertEqual(skills[0].path, '.opencode/skills/my-opencode-skill');
});

test('detects skill at .cursor/skills/skill-name/SKILL.md', () => {
  const tree = [
    { type: 'blob', path: '.cursor/skills/cursor-skill/SKILL.md' }
  ];
  const skills = parseSkillsFromTree(tree);

  assertEqual(skills.length, 1, 'Should find 1 skill');
  assertEqual(skills[0].name, 'cursor-skill');
  assertEqual(skills[0].path, '.cursor/skills/cursor-skill');
});

test('detects skills across multiple platforms', () => {
  const tree = [
    { type: 'blob', path: '.claude/skills/claude-skill/SKILL.md' },
    { type: 'blob', path: '.opencode/skills/opencode-skill/SKILL.md' },
    { type: 'blob', path: '.gemini/skills/gemini-skill/SKILL.md' },
    { type: 'blob', path: '.codex/skills/codex-skill/SKILL.md' },
    { type: 'blob', path: '.cursor/skills/cursor-skill/SKILL.md' }
  ];
  const skills = parseSkillsFromTree(tree);

  assertEqual(skills.length, 5, 'Should find 5 skills from different platforms');
});

test('detects nested skill under .opencode/skills/', () => {
  const tree = [
    { type: 'blob', path: 'packages/app/.opencode/skills/nested-oc-skill/SKILL.md' }
  ];
  const skills = parseSkillsFromTree(tree);

  assertEqual(skills.length, 1, 'Should find 1 nested skill');
  assertEqual(skills[0].name, 'packages/app/nested-oc-skill');
  assertEqual(skills[0].path, 'packages/app/.opencode/skills/nested-oc-skill');
});
```

---

### File: `CLAUDE.md`

#### Update Project Overview (line 7)

```
OLD: Skill Viewer is a Chrome extension that displays Claude Code skills found in GitHub repositories. When visiting any GitHub repo, it shows a sidebar listing skills from `.claude/skills/` or `skills/` directories, with AI-generated summaries.

NEW: Skill Viewer is a Chrome extension that displays AI coding skills found in GitHub repositories. It supports multiple platforms (Claude, Gemini, OpenCode, Codex, Cursor) and scans for skills in `.claude/skills/`, `.gemini/skills/`, `.opencode/skills/`, `.codex/skills/`, `.cursor/skills/`, or `skills/` directories, with AI-generated summaries.
```

#### Update Storage Schema (add defaultPlatform field)

Add after `darkMode: boolean,`:

```
  defaultPlatform: 'claude' | 'gemini' | 'opencode' | 'codex' | 'cursor',
```
