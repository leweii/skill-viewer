# Skill Collector Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add "Collect" feature to skill-viewer Chrome extension, allowing users to generate npx degit commands to download skills to local.

**Architecture:** Extend existing sidebar UI with collect button per skill card. On click, show path selection dropdown, generate degit command, copy to clipboard, show toast feedback.

**Tech Stack:** Vanilla JavaScript, Chrome Extensions API, CSS

---

## Task 1: Add i18n Strings

**Files:**
- Modify: `extension/lib/i18n.js`

**Step 1: Add new i18n keys to English**

In `extension/lib/i18n.js`, add these keys to the `"en"` object after `"getKeyAt"`:

```javascript
"collect": "Collect",
"selectTargetPath": "Select target path",
"globalPath": "Global",
"projectPath": "Project",
"customPath": "Custom",
"confirmCollect": "Confirm",
"commandCopied": "Command copied, paste in terminal to execute",
"cancel": "Cancel"
```

**Step 2: Add Chinese Simplified translations**

Add to `"zh-CN"` object:

```javascript
"collect": "采集",
"selectTargetPath": "选择目标路径",
"globalPath": "全局",
"projectPath": "项目",
"customPath": "自定义",
"confirmCollect": "确认",
"commandCopied": "命令已复制，请在终端中粘贴执行",
"cancel": "取消"
```

**Step 3: Add Chinese Traditional translations**

Add to `"zh-TW"` object:

```javascript
"collect": "採集",
"selectTargetPath": "選擇目標路徑",
"globalPath": "全域",
"projectPath": "專案",
"customPath": "自訂",
"confirmCollect": "確認",
"commandCopied": "命令已複製，請在終端中貼上執行",
"cancel": "取消"
```

**Step 4: Add Japanese translations**

Add to `"ja"` object:

```javascript
"collect": "収集",
"selectTargetPath": "保存先を選択",
"globalPath": "グローバル",
"projectPath": "プロジェクト",
"customPath": "カスタム",
"confirmCollect": "確認",
"commandCopied": "コマンドをコピーしました。ターミナルで貼り付けて実行してください",
"cancel": "キャンセル"
```

**Step 5: Add Korean translations**

Add to `"ko"` object:

```javascript
"collect": "수집",
"selectTargetPath": "대상 경로 선택",
"globalPath": "전역",
"projectPath": "프로젝트",
"customPath": "사용자 지정",
"confirmCollect": "확인",
"commandCopied": "명령어가 복사되었습니다. 터미널에 붙여넣기하여 실행하세요",
"cancel": "취소"
```

**Step 6: Add Spanish translations**

Add to `"es"` object:

```javascript
"collect": "Recolectar",
"selectTargetPath": "Seleccionar ruta destino",
"globalPath": "Global",
"projectPath": "Proyecto",
"customPath": "Personalizado",
"confirmCollect": "Confirmar",
"commandCopied": "Comando copiado, pegalo en la terminal para ejecutar",
"cancel": "Cancelar"
```

**Step 7: Add French translations**

Add to `"fr"` object:

```javascript
"collect": "Collecter",
"selectTargetPath": "Selectionner le chemin cible",
"globalPath": "Global",
"projectPath": "Projet",
"customPath": "Personnalise",
"confirmCollect": "Confirmer",
"commandCopied": "Commande copiee, collez-la dans le terminal pour executer",
"cancel": "Annuler"
```

**Step 8: Add German translations**

Add to `"de"` object:

```javascript
"collect": "Sammeln",
"selectTargetPath": "Zielpfad auswahlen",
"globalPath": "Global",
"projectPath": "Projekt",
"customPath": "Benutzerdefiniert",
"confirmCollect": "Bestatigen",
"commandCopied": "Befehl kopiert, im Terminal einfugen um auszufuhren",
"cancel": "Abbrechen"
```

**Step 9: Commit**

```bash
git add extension/lib/i18n.js
git commit -m "feat: add i18n strings for skill collector"
```

---

## Task 2: Add CSS Styles

**Files:**
- Modify: `extension/sidebar.css`

**Step 1: Add collect button styles**

At the end of `extension/sidebar.css`, add:

```css
/* Collect button */
.sv-collect-btn {
  background: #238636;
  color: #ffffff;
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-left: 8px;
  white-space: nowrap;
}

.sv-collect-btn:hover {
  background: #2ea043;
}

.dark .sv-collect-btn {
  background: #238636;
}

.dark .sv-collect-btn:hover {
  background: #2ea043;
}
```

**Step 2: Add modal overlay styles**

Continue adding:

```css
/* Path selection modal */
.sv-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000001;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sv-modal {
  background: #ffffff;
  border-radius: 8px;
  padding: 20px;
  width: 320px;
  max-width: 90vw;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.dark .sv-modal {
  background: #161b22;
  border: 1px solid #30363d;
}

.sv-modal-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}
```

**Step 3: Add radio button styles**

Continue adding:

```css
/* Radio options */
.sv-radio-group {
  margin-bottom: 16px;
}

.sv-radio-option {
  display: flex;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
}

.sv-radio-option input[type="radio"] {
  margin-right: 10px;
}

.sv-radio-label {
  flex: 1;
}

.sv-radio-hint {
  font-size: 12px;
  color: #57606a;
}

.dark .sv-radio-hint {
  color: #8b949e;
}
```

**Step 4: Add custom path input styles**

Continue adding:

```css
/* Custom path input */
.sv-custom-path {
  display: none;
  margin-top: 8px;
  margin-left: 24px;
}

.sv-custom-path.visible {
  display: block;
}

.sv-custom-path input {
  width: 100%;
  padding: 8px;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  font-size: 13px;
  background: #ffffff;
  color: #24292f;
}

.dark .sv-custom-path input {
  background: #0d1117;
  border-color: #30363d;
  color: #c9d1d9;
}
```

**Step 5: Add modal button styles**

Continue adding:

```css
/* Modal buttons */
.sv-modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.sv-modal-btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid #d0d7de;
  background: #f6f8fa;
  color: #24292f;
}

.sv-modal-btn:hover {
  background: #eaeef2;
}

.dark .sv-modal-btn {
  background: #21262d;
  border-color: #30363d;
  color: #c9d1d9;
}

.dark .sv-modal-btn:hover {
  background: #30363d;
}

.sv-modal-btn.primary {
  background: #238636;
  border-color: #238636;
  color: #ffffff;
}

.sv-modal-btn.primary:hover {
  background: #2ea043;
}
```

**Step 6: Add success toast style**

Continue adding:

```css
/* Success toast */
.sv-toast.success {
  background: #238636;
}
```

**Step 7: Commit**

```bash
git add extension/sidebar.css
git commit -m "feat: add CSS styles for skill collector UI"
```

---

## Task 3: Add Collect Button to Skill Cards

**Files:**
- Modify: `extension/content.js`

**Step 1: Update skill card HTML in renderSkills function**

In `extension/content.js`, find the `renderSkills` function (around line 275). Locate the skill card HTML template and add the collect button.

Find this code:

```javascript
content.innerHTML = skills.map((skill, index) => `
  <div class="sv-skill ${index >= 2 ? 'collapsed' : ''}" data-skill="${escapeHtml(skill.name)}">
    <div class="sv-skill-header">
      <span class="sv-chevron">▼</span>
      <span class="sv-skill-name">${escapeHtml(skill.name)}</span>
    </div>
```

Replace with:

```javascript
content.innerHTML = skills.map((skill, index) => `
  <div class="sv-skill ${index >= 2 ? 'collapsed' : ''}" data-skill="${escapeHtml(skill.name)}" data-skill-path="${escapeHtml(skill.path)}">
    <div class="sv-skill-header">
      <span class="sv-chevron">▼</span>
      <span class="sv-skill-name">${escapeHtml(skill.name)}</span>
      <button class="sv-collect-btn" data-skill="${escapeHtml(skill.name)}" data-path="${escapeHtml(skill.path)}">Collect</button>
    </div>
```

**Step 2: Store repo info for later use**

At the top of `renderSkills` function, add a line to store repo info globally:

Find:

```javascript
async function renderSkills(skills, repoInfo, branch) {
  const content = sidebarEl.querySelector('.sv-content');
```

Replace with:

```javascript
async function renderSkills(skills, repoInfo, branch) {
  // Store for collect feature
  window.__skillViewerRepoInfo = { repoInfo, branch };

  const content = sidebarEl.querySelector('.sv-content');
```

**Step 3: Commit**

```bash
git add extension/content.js
git commit -m "feat: add collect button to skill cards"
```

---

## Task 4: Implement Path Selection Modal

**Files:**
- Modify: `extension/content.js`

**Step 1: Add showCollectModal function**

After the `showToast` function (around line 388), add the modal function:

```javascript
function showCollectModal(skillName, skillPath) {
  // Remove existing modal
  const existing = document.querySelector('.sv-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'sv-modal-overlay';

  // Check dark mode
  chrome.storage.local.get(['darkMode'], (settings) => {
    const isDark = settings.darkMode;

    overlay.innerHTML = `
      <div class="sv-modal ${isDark ? 'dark' : ''}">
        <h3 class="sv-modal-title">Select target path</h3>
        <div class="sv-radio-group">
          <label class="sv-radio-option">
            <input type="radio" name="sv-path" value="global" checked>
            <span class="sv-radio-label">
              ~/.claude/skills/
              <span class="sv-radio-hint">(Global)</span>
            </span>
          </label>
          <label class="sv-radio-option">
            <input type="radio" name="sv-path" value="project">
            <span class="sv-radio-label">
              ./.claude/skills/
              <span class="sv-radio-hint">(Project)</span>
            </span>
          </label>
          <label class="sv-radio-option">
            <input type="radio" name="sv-path" value="custom">
            <span class="sv-radio-label">Custom</span>
          </label>
          <div class="sv-custom-path">
            <input type="text" placeholder="Enter custom path..." value="">
          </div>
        </div>
        <div class="sv-modal-buttons">
          <button class="sv-modal-btn cancel">Cancel</button>
          <button class="sv-modal-btn primary confirm">Confirm</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Handle radio change for custom path visibility
    const radios = overlay.querySelectorAll('input[name="sv-path"]');
    const customPathDiv = overlay.querySelector('.sv-custom-path');

    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'custom' && radio.checked) {
          customPathDiv.classList.add('visible');
        } else {
          customPathDiv.classList.remove('visible');
        }
      });
    });

    // Handle cancel
    overlay.querySelector('.cancel').addEventListener('click', () => {
      overlay.remove();
    });

    // Handle click outside modal
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    // Handle confirm
    overlay.querySelector('.confirm').addEventListener('click', () => {
      const selected = overlay.querySelector('input[name="sv-path"]:checked').value;
      let targetPath;

      if (selected === 'global') {
        targetPath = '~/.claude/skills/';
      } else if (selected === 'project') {
        targetPath = './.claude/skills/';
      } else {
        targetPath = overlay.querySelector('.sv-custom-path input').value.trim();
        if (!targetPath) {
          targetPath = '~/.claude/skills/';
        }
        if (!targetPath.endsWith('/')) {
          targetPath += '/';
        }
      }

      generateAndCopyCommand(skillName, skillPath, targetPath);
      overlay.remove();
    });
  });
}
```

**Step 2: Commit**

```bash
git add extension/content.js
git commit -m "feat: add path selection modal"
```

---

## Task 5: Implement Command Generation and Copy

**Files:**
- Modify: `extension/content.js`

**Step 1: Add generateAndCopyCommand function**

After the `showCollectModal` function, add:

```javascript
function generateAndCopyCommand(skillName, skillPath, targetPath) {
  const { repoInfo, branch } = window.__skillViewerRepoInfo || {};

  if (!repoInfo) {
    showToast('Error: Repository info not available', true);
    return;
  }

  // Generate degit command
  // Format: npx degit owner/repo/path targetPath/skillName
  const sourcePath = `${repoInfo.owner}/${repoInfo.repo}/${skillPath}`;
  const destPath = `${targetPath}${skillName}`;
  const command = `npx degit ${sourcePath} ${destPath}`;

  // Copy to clipboard
  navigator.clipboard.writeText(command).then(() => {
    showToast('Command copied, paste in terminal to execute');
  }).catch(err => {
    console.error('Failed to copy:', err);
    showToast('Failed to copy command', true);
  });
}
```

**Step 2: Update showToast to support success style**

Find the `showToast` function and update it:

```javascript
function showToast(message, isError = false) {
  const existing = document.querySelector('.sv-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `sv-toast ${isError ? 'error' : 'success'}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}
```

**Step 3: Bind collect button click events**

In the `renderSkills` function, after the collapse toggle binding (around line 297-301), add:

```javascript
// Bind collect buttons
content.querySelectorAll('.sv-collect-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent triggering collapse
    const skillName = btn.dataset.skill;
    const skillPath = btn.dataset.path;
    showCollectModal(skillName, skillPath);
  });
});
```

**Step 4: Commit**

```bash
git add extension/content.js
git commit -m "feat: implement command generation and clipboard copy"
```

---

## Task 6: Manual Testing

**Step 1: Load extension in Chrome**

1. Open Chrome, go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension` folder from worktree

**Step 2: Test on GitHub**

1. Navigate to a repository with Claude skills (e.g., one with `.claude/skills/` directory)
2. Verify sidebar appears with skills
3. Verify each skill card has a green "Collect" button

**Step 3: Test collect flow**

1. Click "Collect" button on a skill
2. Verify modal appears with path options
3. Select "Global" and click Confirm
4. Verify toast shows "Command copied..."
5. Paste in terminal and verify command format is correct

**Step 4: Test custom path**

1. Click "Collect" again
2. Select "Custom"
3. Enter a custom path like `~/my-skills/`
4. Click Confirm
5. Verify command uses custom path

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete skill collector feature"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add i18n strings | lib/i18n.js |
| 2 | Add CSS styles | sidebar.css |
| 3 | Add collect button to cards | content.js |
| 4 | Implement path selection modal | content.js |
| 5 | Implement command generation | content.js |
| 6 | Manual testing | - |

Total estimated commits: 5
