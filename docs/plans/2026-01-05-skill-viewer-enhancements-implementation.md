# Skill Viewer v1.1.0 Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add draggable sidebar, multi-provider LLM support, language configuration, and fix settings bug.

**Architecture:** Extend existing Chrome extension with resize handle on sidebar, abstracted LLM provider layer supporting Gemini/OpenAI/Claude, and separate i18n for UI text and summary language preference.

**Tech Stack:** Chrome Extension Manifest V3, vanilla JS, chrome.storage.local

---

## Task 1: Fix Settings Page Not Opening

**Files:**
- Modify: `extension/content.js:190-193`
- Modify: `extension/background.js:62-83`

**Step 1: Update content.js to send message instead of direct call**

In `content.js`, find lines 190-193:
```javascript
sidebarEl.querySelector('.sv-settings-link').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
```

Replace with:
```javascript
sidebarEl.querySelector('.sv-settings-link').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
});
```

**Step 2: Add OPEN_OPTIONS handler in background.js**

In `background.js`, add after line 82 (after the FETCH_SKILL_CONTENT handler):
```javascript
if (request.type === 'OPEN_OPTIONS') {
  chrome.runtime.openOptionsPage();
  sendResponse({ success: true });
  return true;
}
```

**Step 3: Manually test**

1. Load extension in chrome://extensions
2. Go to any GitHub repo
3. Click settings link in sidebar footer
4. Verify options page opens

**Step 4: Commit**

```bash
git add extension/content.js extension/background.js
git commit -m "fix: delegate openOptionsPage to background script"
```

---

## Task 2: Add Resize Handle CSS

**Files:**
- Modify: `extension/sidebar.css:1-20`

**Step 1: Add resize handle styles**

Add after line 20 (after `#skill-viewer-sidebar` closing brace):
```css
/* Resize handle */
.sv-resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  width: 5px;
  height: 100%;
  cursor: ew-resize;
  background: transparent;
  z-index: 1;
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

**Step 2: Commit**

```bash
git add extension/sidebar.css
git commit -m "style: add resize handle styles"
```

---

## Task 3: Implement Draggable Sidebar Width

**Files:**
- Modify: `extension/content.js:159-194`

**Step 1: Update showSidebar function to add resize handle**

Find the `showSidebar` function (line 159). Replace the entire function with:

```javascript
function showSidebar() {
  if (sidebarEl) {
    sidebarEl.classList.remove('hidden');
    return;
  }

  sidebarEl = document.createElement('div');
  sidebarEl.id = 'skill-viewer-sidebar';
  sidebarEl.innerHTML = `
    <div class="sv-resize-handle"></div>
    <div class="sv-header">
      <h2>Claude Skills</h2>
      <button class="sv-close-btn" title="Close">✕</button>
    </div>
    <div class="sv-content"></div>
    <div class="sv-footer">
      <a href="#" class="sv-settings-link">Settings</a>
    </div>
  `;

  // Load saved width and dark mode
  chrome.storage.local.get(['darkMode', 'sidebarWidth'], (settings) => {
    if (settings.darkMode) sidebarEl.classList.add('dark');
    if (settings.sidebarWidth) {
      sidebarEl.style.width = settings.sidebarWidth + 'px';
    }
  });

  document.body.appendChild(sidebarEl);

  // Bind close button
  sidebarEl.querySelector('.sv-close-btn').addEventListener('click', () => {
    sidebarEl.classList.add('hidden');
  });

  // Bind settings link
  sidebarEl.querySelector('.sv-settings-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
  });

  // Setup resize handle
  setupResizeHandle();
}

function setupResizeHandle() {
  const handle = sidebarEl.querySelector('.sv-resize-handle');
  const MIN_WIDTH = 250;
  const MAX_WIDTH = 600;
  let isResizing = false;

  handle.addEventListener('mousedown', (e) => {
    isResizing = true;
    handle.classList.add('dragging');
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const newWidth = window.innerWidth - e.clientX;
    const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth));
    sidebarEl.style.width = clampedWidth + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    handle.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Save width
    const width = parseInt(sidebarEl.style.width) || 350;
    chrome.storage.local.set({ sidebarWidth: width });
  });
}
```

**Step 2: Manually test**

1. Reload extension
2. Go to GitHub repo with skills
3. Drag left edge of sidebar
4. Verify width changes between 250-600px
5. Refresh page, verify width persists

**Step 3: Commit**

```bash
git add extension/content.js
git commit -m "feat: add draggable sidebar width"
```

---

## Task 4: Create i18n Translations File

**Files:**
- Create: `extension/lib/i18n.js`

**Step 1: Create i18n.js with all translations**

```javascript
// Internationalization strings
const i18n = {
  "en": {
    "title": "Claude Skills",
    "settings": "Settings",
    "scanning": "Scanning for skills...",
    "noSkills": "No Claude skills found in this repository.",
    "viewFull": "View Full Skill",
    "viewOnGitHub": "View on GitHub",
    "loading": "Loading...",
    "failedToLoad": "Failed to load skill",
    "provider": "AI Provider",
    "apiKey": "API Key",
    "testKey": "Test Key",
    "save": "Save",
    "testing": "Testing...",
    "saving": "Saving...",
    "settingsSaved": "Settings saved!",
    "keyValid": "API key is valid!",
    "keyInvalid": "Invalid API key. Please check and try again.",
    "enterKey": "Please enter an API key first",
    "uiLanguage": "Interface Language",
    "summaryLanguage": "Summary Language",
    "autoOpen": "Auto-open sidebar when skills are found",
    "darkMode": "Dark mode",
    "getKeyAt": "Get your key at"
  },
  "zh-CN": {
    "title": "Claude 技能",
    "settings": "设置",
    "scanning": "正在扫描技能...",
    "noSkills": "此仓库未找到 Claude 技能。",
    "viewFull": "查看完整技能",
    "viewOnGitHub": "在 GitHub 上查看",
    "loading": "加载中...",
    "failedToLoad": "技能加载失败",
    "provider": "AI 提供商",
    "apiKey": "API 密钥",
    "testKey": "测试密钥",
    "save": "保存",
    "testing": "测试中...",
    "saving": "保存中...",
    "settingsSaved": "设置已保存！",
    "keyValid": "API 密钥有效！",
    "keyInvalid": "API 密钥无效，请检查后重试。",
    "enterKey": "请先输入 API 密钥",
    "uiLanguage": "界面语言",
    "summaryLanguage": "摘要语言",
    "autoOpen": "发现技能时自动打开侧边栏",
    "darkMode": "深色模式",
    "getKeyAt": "获取密钥"
  },
  "zh-TW": {
    "title": "Claude 技能",
    "settings": "設定",
    "scanning": "正在掃描技能...",
    "noSkills": "此倉庫未找到 Claude 技能。",
    "viewFull": "查看完整技能",
    "viewOnGitHub": "在 GitHub 上查看",
    "loading": "載入中...",
    "failedToLoad": "技能載入失敗",
    "provider": "AI 提供商",
    "apiKey": "API 金鑰",
    "testKey": "測試金鑰",
    "save": "儲存",
    "testing": "測試中...",
    "saving": "儲存中...",
    "settingsSaved": "設定已儲存！",
    "keyValid": "API 金鑰有效！",
    "keyInvalid": "API 金鑰無效，請檢查後重試。",
    "enterKey": "請先輸入 API 金鑰",
    "uiLanguage": "介面語言",
    "summaryLanguage": "摘要語言",
    "autoOpen": "發現技能時自動開啟側邊欄",
    "darkMode": "深色模式",
    "getKeyAt": "取得金鑰"
  },
  "ja": {
    "title": "Claude スキル",
    "settings": "設定",
    "scanning": "スキルをスキャン中...",
    "noSkills": "このリポジトリにClaudeスキルは見つかりませんでした。",
    "viewFull": "完全なスキルを表示",
    "viewOnGitHub": "GitHubで表示",
    "loading": "読み込み中...",
    "failedToLoad": "スキルの読み込みに失敗しました",
    "provider": "AIプロバイダー",
    "apiKey": "APIキー",
    "testKey": "キーをテスト",
    "save": "保存",
    "testing": "テスト中...",
    "saving": "保存中...",
    "settingsSaved": "設定を保存しました！",
    "keyValid": "APIキーは有効です！",
    "keyInvalid": "APIキーが無効です。確認してください。",
    "enterKey": "APIキーを入力してください",
    "uiLanguage": "インターフェース言語",
    "summaryLanguage": "要約言語",
    "autoOpen": "スキル検出時にサイドバーを自動で開く",
    "darkMode": "ダークモード",
    "getKeyAt": "キーを取得"
  },
  "ko": {
    "title": "Claude 스킬",
    "settings": "설정",
    "scanning": "스킬 스캔 중...",
    "noSkills": "이 저장소에서 Claude 스킬을 찾을 수 없습니다.",
    "viewFull": "전체 스킬 보기",
    "viewOnGitHub": "GitHub에서 보기",
    "loading": "로딩 중...",
    "failedToLoad": "스킬 로드 실패",
    "provider": "AI 제공자",
    "apiKey": "API 키",
    "testKey": "키 테스트",
    "save": "저장",
    "testing": "테스트 중...",
    "saving": "저장 중...",
    "settingsSaved": "설정이 저장되었습니다!",
    "keyValid": "API 키가 유효합니다!",
    "keyInvalid": "API 키가 유효하지 않습니다. 확인 후 다시 시도하세요.",
    "enterKey": "API 키를 먼저 입력하세요",
    "uiLanguage": "인터페이스 언어",
    "summaryLanguage": "요약 언어",
    "autoOpen": "스킬 발견 시 사이드바 자동 열기",
    "darkMode": "다크 모드",
    "getKeyAt": "키 받기"
  },
  "es": {
    "title": "Habilidades Claude",
    "settings": "Configuración",
    "scanning": "Escaneando habilidades...",
    "noSkills": "No se encontraron habilidades Claude en este repositorio.",
    "viewFull": "Ver Habilidad Completa",
    "viewOnGitHub": "Ver en GitHub",
    "loading": "Cargando...",
    "failedToLoad": "Error al cargar habilidad",
    "provider": "Proveedor de IA",
    "apiKey": "Clave API",
    "testKey": "Probar Clave",
    "save": "Guardar",
    "testing": "Probando...",
    "saving": "Guardando...",
    "settingsSaved": "¡Configuración guardada!",
    "keyValid": "¡La clave API es válida!",
    "keyInvalid": "Clave API inválida. Por favor verifica e intenta de nuevo.",
    "enterKey": "Por favor ingresa una clave API primero",
    "uiLanguage": "Idioma de Interfaz",
    "summaryLanguage": "Idioma de Resumen",
    "autoOpen": "Abrir barra lateral automáticamente al encontrar habilidades",
    "darkMode": "Modo oscuro",
    "getKeyAt": "Obtén tu clave en"
  },
  "fr": {
    "title": "Compétences Claude",
    "settings": "Paramètres",
    "scanning": "Recherche de compétences...",
    "noSkills": "Aucune compétence Claude trouvée dans ce dépôt.",
    "viewFull": "Voir la Compétence Complète",
    "viewOnGitHub": "Voir sur GitHub",
    "loading": "Chargement...",
    "failedToLoad": "Échec du chargement",
    "provider": "Fournisseur IA",
    "apiKey": "Clé API",
    "testKey": "Tester la Clé",
    "save": "Enregistrer",
    "testing": "Test en cours...",
    "saving": "Enregistrement...",
    "settingsSaved": "Paramètres enregistrés !",
    "keyValid": "La clé API est valide !",
    "keyInvalid": "Clé API invalide. Veuillez vérifier et réessayer.",
    "enterKey": "Veuillez entrer une clé API d'abord",
    "uiLanguage": "Langue de l'Interface",
    "summaryLanguage": "Langue du Résumé",
    "autoOpen": "Ouvrir automatiquement la barre latérale quand des compétences sont trouvées",
    "darkMode": "Mode sombre",
    "getKeyAt": "Obtenez votre clé sur"
  },
  "de": {
    "title": "Claude Fähigkeiten",
    "settings": "Einstellungen",
    "scanning": "Suche nach Fähigkeiten...",
    "noSkills": "Keine Claude-Fähigkeiten in diesem Repository gefunden.",
    "viewFull": "Vollständige Fähigkeit anzeigen",
    "viewOnGitHub": "Auf GitHub anzeigen",
    "loading": "Laden...",
    "failedToLoad": "Laden fehlgeschlagen",
    "provider": "KI-Anbieter",
    "apiKey": "API-Schlüssel",
    "testKey": "Schlüssel testen",
    "save": "Speichern",
    "testing": "Teste...",
    "saving": "Speichere...",
    "settingsSaved": "Einstellungen gespeichert!",
    "keyValid": "API-Schlüssel ist gültig!",
    "keyInvalid": "Ungültiger API-Schlüssel. Bitte überprüfen und erneut versuchen.",
    "enterKey": "Bitte geben Sie zuerst einen API-Schlüssel ein",
    "uiLanguage": "Oberflächensprache",
    "summaryLanguage": "Zusammenfassungssprache",
    "autoOpen": "Seitenleiste automatisch öffnen wenn Fähigkeiten gefunden werden",
    "darkMode": "Dunkler Modus",
    "getKeyAt": "Holen Sie sich Ihren Schlüssel bei"
  }
};

// Language names for dropdown display
const languageNames = {
  "en": "English",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  "ja": "日本語",
  "ko": "한국어",
  "es": "Español",
  "fr": "Français",
  "de": "Deutsch"
};

// Get translated string
function t(key, lang = 'en') {
  return i18n[lang]?.[key] || i18n['en'][key] || key;
}

// Get full language name for prompts
function getLanguageName(code) {
  const names = {
    "en": "English",
    "zh-CN": "Simplified Chinese",
    "zh-TW": "Traditional Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "es": "Spanish",
    "fr": "French",
    "de": "German"
  };
  return names[code] || "English";
}

// Export for use in other files
if (typeof module !== 'undefined') {
  module.exports = { i18n, languageNames, t, getLanguageName };
}
```

**Step 2: Commit**

```bash
mkdir -p extension/lib
git add extension/lib/i18n.js
git commit -m "feat: add i18n translations for 8 languages"
```

---

## Task 5: Create Multi-Provider LLM Module

**Files:**
- Create: `extension/lib/providers.js`

**Step 1: Create providers.js with all LLM integrations**

```javascript
// LLM Provider configurations and API calls

const PROVIDERS = {
  gemini: {
    name: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    defaultModel: 'gemini-2.0-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyPlaceholder: 'AIza...'
  },
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-...'
  },
  claude: {
    name: 'Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-haiku-20240307',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyPlaceholder: 'sk-ant-...'
  }
};

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

Provide a concise summary (2-3 sentences) that answers:
1. What does this skill do?
2. When should a developer use it?

Keep it practical and scannable. No markdown formatting.${langInstruction}`;
}

async function summarizeWithGemini(apiKey, model, skillName, skillContent, summaryLanguage) {
  const endpoint = PROVIDERS.gemini.endpoint.replace('{model}', model);

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: buildPrompt(skillName, skillContent, summaryLanguage) }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200
      }
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 400 || response.status === 403) throw new Error('Invalid API key');
    if (response.status === 429) throw new Error('Rate limited');
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Empty response from Gemini');
  }
  return data.candidates[0].content.parts[0].text.trim();
}

async function summarizeWithOpenAI(apiKey, model, skillName, skillContent, summaryLanguage) {
  const response = await fetch(PROVIDERS.openai.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{
        role: 'user',
        content: buildPrompt(skillName, skillContent, summaryLanguage)
      }],
      temperature: 0.3,
      max_tokens: 200
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Invalid API key');
    if (response.status === 429) throw new Error('Rate limited');
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Empty response from OpenAI');
  }
  return data.choices[0].message.content.trim();
}

async function summarizeWithClaude(apiKey, model, skillName, skillContent, summaryLanguage) {
  const response = await fetch(PROVIDERS.claude.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: buildPrompt(skillName, skillContent, summaryLanguage)
      }]
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Invalid API key');
    if (response.status === 429) throw new Error('Rate limited');
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.content?.[0]?.text) {
    throw new Error('Empty response from Claude');
  }
  return data.content[0].text.trim();
}

async function summarizeSkill(provider, apiKey, model, skillName, skillContent, summaryLanguage) {
  switch (provider) {
    case 'gemini':
      return summarizeWithGemini(apiKey, model, skillName, skillContent, summaryLanguage);
    case 'openai':
      return summarizeWithOpenAI(apiKey, model, skillName, skillContent, summaryLanguage);
    case 'claude':
      return summarizeWithClaude(apiKey, model, skillName, skillContent, summaryLanguage);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function testApiKey(provider, apiKey) {
  try {
    switch (provider) {
      case 'gemini': {
        const endpoint = PROVIDERS.gemini.endpoint.replace('{model}', PROVIDERS.gemini.defaultModel);
        const response = await fetch(`${endpoint}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say "ok"' }] }]
          })
        });
        return response.ok;
      }
      case 'openai': {
        const response = await fetch(PROVIDERS.openai.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Say "ok"' }],
            max_tokens: 5
          })
        });
        return response.ok;
      }
      case 'claude': {
        const response = await fetch(PROVIDERS.claude.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 5,
            messages: [{ role: 'user', content: 'Say "ok"' }]
          })
        });
        return response.ok;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

// Export for use
if (typeof module !== 'undefined') {
  module.exports = { PROVIDERS, summarizeSkill, testApiKey, buildPrompt };
}
```

**Step 2: Commit**

```bash
git add extension/lib/providers.js
git commit -m "feat: add multi-provider LLM module (Gemini, OpenAI, Claude)"
```

---

## Task 6: Update Background Service Worker

**Files:**
- Modify: `extension/background.js` (complete rewrite)

**Step 1: Rewrite background.js to use provider module**

```javascript
// Background service worker for Skill Viewer extension

// Import provider configurations (inline for service worker)
const PROVIDERS = {
  gemini: {
    name: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    defaultModel: 'gemini-2.0-flash'
  },
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini'
  },
  claude: {
    name: 'Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-haiku-20240307'
  }
};

// Language names for prompts
function getLanguageName(code) {
  const names = {
    "en": "English",
    "zh-CN": "Simplified Chinese",
    "zh-TW": "Traditional Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "es": "Spanish",
    "fr": "French",
    "de": "German"
  };
  return names[code] || "English";
}

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

Provide a concise summary (2-3 sentences) that answers:
1. What does this skill do?
2. When should a developer use it?

Keep it practical and scannable. No markdown formatting.${langInstruction}`;
}

// Provider-specific summarize functions
async function summarizeWithGemini(apiKey, model, skillName, skillContent, summaryLanguage) {
  const endpoint = PROVIDERS.gemini.endpoint.replace('{model}', model);

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: buildPrompt(skillName, skillContent, summaryLanguage) }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200
      }
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 400 || response.status === 403) throw new Error('Invalid API key');
    if (response.status === 429) throw new Error('Rate limited');
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Empty response from Gemini');
  }
  return data.candidates[0].content.parts[0].text.trim();
}

async function summarizeWithOpenAI(apiKey, model, skillName, skillContent, summaryLanguage) {
  const response = await fetch(PROVIDERS.openai.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{
        role: 'user',
        content: buildPrompt(skillName, skillContent, summaryLanguage)
      }],
      temperature: 0.3,
      max_tokens: 200
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Invalid API key');
    if (response.status === 429) throw new Error('Rate limited');
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Empty response from OpenAI');
  }
  return data.choices[0].message.content.trim();
}

async function summarizeWithClaude(apiKey, model, skillName, skillContent, summaryLanguage) {
  const response = await fetch(PROVIDERS.claude.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: buildPrompt(skillName, skillContent, summaryLanguage)
      }]
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Invalid API key');
    if (response.status === 429) throw new Error('Rate limited');
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.content?.[0]?.text) {
    throw new Error('Empty response from Claude');
  }
  return data.content[0].text.trim();
}

async function summarizeSkill(provider, apiKey, model, skillName, skillContent, summaryLanguage) {
  switch (provider) {
    case 'gemini':
      return summarizeWithGemini(apiKey, model, skillName, skillContent, summaryLanguage);
    case 'openai':
      return summarizeWithOpenAI(apiKey, model, skillName, skillContent, summaryLanguage);
    case 'claude':
      return summarizeWithClaude(apiKey, model, skillName, skillContent, summaryLanguage);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function testProviderApiKey(provider, apiKey) {
  try {
    switch (provider) {
      case 'gemini': {
        const endpoint = PROVIDERS.gemini.endpoint.replace('{model}', PROVIDERS.gemini.defaultModel);
        const response = await fetch(`${endpoint}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say "ok"' }] }]
          })
        });
        return response.ok;
      }
      case 'openai': {
        const response = await fetch(PROVIDERS.openai.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Say "ok"' }],
            max_tokens: 5
          })
        });
        return response.ok;
      }
      case 'claude': {
        const response = await fetch(PROVIDERS.claude.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 5,
            messages: [{ role: 'user', content: 'Say "ok"' }]
          })
        });
        return response.ok;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SUMMARIZE_SKILL') {
    handleSummarize(request)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.type === 'TEST_API_KEY') {
    const provider = request.provider || 'gemini';
    testProviderApiKey(provider, request.apiKey)
      .then(valid => sendResponse({ valid }))
      .catch(err => sendResponse({ valid: false, error: err.message }));
    return true;
  }

  if (request.type === 'FETCH_SKILL_CONTENT') {
    fetchSkillContent(request.url)
      .then(content => sendResponse({ content }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }
});

async function handleSummarize(request) {
  const { skillName, skillContent } = request;

  // Get settings from storage
  const settings = await chrome.storage.local.get([
    'llmProvider',
    'providers',
    'summaryLanguage',
    // Legacy support
    'geminiApiKey'
  ]);

  const provider = settings.llmProvider || 'gemini';
  const summaryLanguage = settings.summaryLanguage || 'en';

  // Get API key - support both new and legacy storage
  let apiKey, model;
  if (settings.providers?.[provider]) {
    apiKey = settings.providers[provider].apiKey;
    model = settings.providers[provider].model || PROVIDERS[provider].defaultModel;
  } else if (provider === 'gemini' && settings.geminiApiKey) {
    // Legacy support
    apiKey = settings.geminiApiKey;
    model = PROVIDERS.gemini.defaultModel;
  }

  if (!apiKey) {
    return { error: 'No API key configured', fallback: true };
  }

  // Check cache first
  const cacheKey = `summary_${request.repo}_${skillName}_${summaryLanguage}`;
  const cached = await chrome.storage.local.get(cacheKey);

  if (cached[cacheKey]?.summary) {
    const age = Date.now() - cached[cacheKey].timestamp;
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (age < ONE_DAY) {
      return { summary: cached[cacheKey].summary, cached: true };
    }
  }

  try {
    const summary = await summarizeSkill(provider, apiKey, model, skillName, skillContent, summaryLanguage);

    // Cache the result
    await chrome.storage.local.set({
      [cacheKey]: {
        summary,
        timestamp: Date.now()
      }
    });

    return { summary };
  } catch (err) {
    return { error: err.message, fallback: true };
  }
}

async function fetchSkillContent(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  return await response.text();
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.runtime.openOptionsPage();
});
```

**Step 2: Commit**

```bash
git add extension/background.js
git commit -m "refactor: update background.js for multi-provider support"
```

---

## Task 7: Update Manifest for Anthropic API

**Files:**
- Modify: `extension/manifest.json`

**Step 1: Add Anthropic host permission and update version**

Update manifest.json:
```json
{
  "manifest_version": 3,
  "name": "Skill Viewer",
  "version": "1.1.0",
  "description": "View Claude Code skills on GitHub with AI-powered summaries",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://github.com/*",
    "https://api.github.com/*",
    "https://raw.githubusercontent.com/*",
    "https://generativelanguage.googleapis.com/*",
    "https://api.openai.com/*",
    "https://api.anthropic.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://github.com/*/*"],
      "js": ["content.js"],
      "css": ["sidebar.css"],
      "run_at": "document_idle"
    }
  ],
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    },
    "default_title": "Skill Viewer"
  }
}
```

**Step 2: Commit**

```bash
git add extension/manifest.json
git commit -m "chore: add OpenAI and Anthropic host permissions, bump to v1.1.0"
```

---

## Task 8: Rewrite Options Page HTML

**Files:**
- Modify: `extension/options.html` (complete rewrite)

**Step 1: Update options.html with new layout**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skill Viewer Settings</title>
  <style>
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f6f8fa;
      --text-primary: #24292f;
      --text-secondary: #57606a;
      --border-color: #d0d7de;
      --accent-color: #0969da;
      --accent-hover: #0550ae;
      --success-color: #1a7f37;
      --error-color: #cf222e;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: var(--bg-secondary);
      color: var(--text-primary);
      line-height: 1.6;
      padding: 40px;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background: var(--bg-primary);
      border-radius: 8px;
      border: 1px solid var(--border-color);
      padding: 24px;
    }

    h1 {
      font-size: 24px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .section {
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-color);
    }

    .section:last-of-type {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
    }

    input[type="password"],
    input[type="text"],
    select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 14px;
      margin-bottom: 8px;
    }

    input:focus,
    select:focus {
      outline: none;
      border-color: var(--accent-color);
      box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15);
    }

    .hint {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 16px;
    }

    .hint a {
      color: var(--accent-color);
    }

    /* Provider radio buttons */
    .provider-options {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .provider-option {
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .provider-option input {
      margin-right: 6px;
    }

    .button-group {
      display: flex;
      gap: 8px;
    }

    button {
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid var(--border-color);
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    button:hover {
      background: var(--bg-secondary);
    }

    button.primary {
      background: var(--accent-color);
      color: white;
      border-color: var(--accent-color);
    }

    button.primary:hover {
      background: var(--accent-hover);
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .status {
      margin-top: 12px;
      padding: 10px;
      border-radius: 6px;
      font-size: 13px;
      display: none;
    }

    .status.success {
      display: block;
      background: #dafbe1;
      color: var(--success-color);
      border: 1px solid #a7f3d0;
    }

    .status.error {
      display: block;
      background: #ffebe9;
      color: var(--error-color);
      border: 1px solid #ff8182;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
    }

    .checkbox-item input {
      margin-right: 10px;
      width: 16px;
      height: 16px;
    }

    .checkbox-item label {
      margin: 0;
      font-weight: normal;
    }

    .language-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 8px;
    }

    .language-group label {
      margin-bottom: 6px;
    }

    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
      font-size: 12px;
      color: var(--text-secondary);
    }

    .footer a {
      color: var(--accent-color);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 id="title">Skill Viewer Settings</h1>

    <div class="section">
      <div class="section-title" id="section-provider">AI Provider</div>

      <div class="provider-options">
        <label class="provider-option">
          <input type="radio" name="provider" value="gemini" checked>
          Gemini
        </label>
        <label class="provider-option">
          <input type="radio" name="provider" value="openai">
          OpenAI
        </label>
        <label class="provider-option">
          <input type="radio" name="provider" value="claude">
          Claude
        </label>
      </div>

      <label for="api-key" id="label-api-key">API Key</label>
      <input type="password" id="api-key" placeholder="AIza...">
      <p class="hint" id="key-hint">
        Get your key at <a href="https://aistudio.google.com/apikey" target="_blank" id="key-link">aistudio.google.com</a>
      </p>

      <div class="button-group">
        <button id="test-btn">Test Key</button>
        <button id="save-btn" class="primary">Save</button>
      </div>
      <div id="status" class="status"></div>
    </div>

    <div class="section">
      <div class="section-title" id="section-language">Language Settings</div>

      <div class="language-row">
        <div class="language-group">
          <label for="ui-language" id="label-ui-language">Interface Language</label>
          <select id="ui-language">
            <option value="en">English</option>
            <option value="zh-CN">简体中文</option>
            <option value="zh-TW">繁體中文</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
        <div class="language-group">
          <label for="summary-language" id="label-summary-language">Summary Language</label>
          <select id="summary-language">
            <option value="en">English</option>
            <option value="zh-CN">简体中文</option>
            <option value="zh-TW">繁體中文</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title" id="section-display">Display</div>

      <div class="checkbox-item">
        <input type="checkbox" id="auto-open" checked>
        <label for="auto-open" id="label-auto-open">Auto-open sidebar when skills are found</label>
      </div>
      <div class="checkbox-item">
        <input type="checkbox" id="dark-mode">
        <label for="dark-mode" id="label-dark-mode">Dark mode</label>
      </div>
    </div>

    <div class="footer">
      Skill Viewer v1.1.0 |
      <a href="https://github.com/anthropics/claude-code" target="_blank">Claude Code</a>
    </div>
  </div>

  <script src="options.js"></script>
</body>
</html>
```

**Step 2: Commit**

```bash
git add extension/options.html
git commit -m "feat: redesign options page with provider and language settings"
```

---

## Task 9: Rewrite Options Page JavaScript

**Files:**
- Modify: `extension/options.js` (complete rewrite)

**Step 1: Update options.js with full functionality**

```javascript
// Options page logic

// Provider configurations
const PROVIDERS = {
  gemini: {
    name: 'Gemini',
    keyUrl: 'https://aistudio.google.com/apikey',
    placeholder: 'AIza...'
  },
  openai: {
    name: 'OpenAI',
    keyUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-...'
  },
  claude: {
    name: 'Claude',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    placeholder: 'sk-ant-...'
  }
};

// i18n translations (inline for options page)
const i18n = {
  "en": {
    "title": "Skill Viewer Settings",
    "sectionProvider": "AI Provider",
    "sectionLanguage": "Language Settings",
    "sectionDisplay": "Display",
    "apiKey": "API Key",
    "testKey": "Test Key",
    "save": "Save",
    "testing": "Testing...",
    "saving": "Saving...",
    "settingsSaved": "Settings saved!",
    "keyValid": "API key is valid!",
    "keyInvalid": "Invalid API key. Please check and try again.",
    "enterKey": "Please enter an API key first",
    "getKeyAt": "Get your key at",
    "uiLanguage": "Interface Language",
    "summaryLanguage": "Summary Language",
    "autoOpen": "Auto-open sidebar when skills are found",
    "darkMode": "Dark mode"
  },
  "zh-CN": {
    "title": "Skill Viewer 设置",
    "sectionProvider": "AI 提供商",
    "sectionLanguage": "语言设置",
    "sectionDisplay": "显示",
    "apiKey": "API 密钥",
    "testKey": "测试密钥",
    "save": "保存",
    "testing": "测试中...",
    "saving": "保存中...",
    "settingsSaved": "设置已保存！",
    "keyValid": "API 密钥有效！",
    "keyInvalid": "API 密钥无效，请检查后重试。",
    "enterKey": "请先输入 API 密钥",
    "getKeyAt": "获取密钥",
    "uiLanguage": "界面语言",
    "summaryLanguage": "摘要语言",
    "autoOpen": "发现技能时自动打开侧边栏",
    "darkMode": "深色模式"
  },
  "zh-TW": {
    "title": "Skill Viewer 設定",
    "sectionProvider": "AI 提供商",
    "sectionLanguage": "語言設定",
    "sectionDisplay": "顯示",
    "apiKey": "API 金鑰",
    "testKey": "測試金鑰",
    "save": "儲存",
    "testing": "測試中...",
    "saving": "儲存中...",
    "settingsSaved": "設定已儲存！",
    "keyValid": "API 金鑰有效！",
    "keyInvalid": "API 金鑰無效，請檢查後重試。",
    "enterKey": "請先輸入 API 金鑰",
    "getKeyAt": "取得金鑰",
    "uiLanguage": "介面語言",
    "summaryLanguage": "摘要語言",
    "autoOpen": "發現技能時自動開啟側邊欄",
    "darkMode": "深色模式"
  },
  "ja": {
    "title": "Skill Viewer 設定",
    "sectionProvider": "AIプロバイダー",
    "sectionLanguage": "言語設定",
    "sectionDisplay": "表示",
    "apiKey": "APIキー",
    "testKey": "キーをテスト",
    "save": "保存",
    "testing": "テスト中...",
    "saving": "保存中...",
    "settingsSaved": "設定を保存しました！",
    "keyValid": "APIキーは有効です！",
    "keyInvalid": "APIキーが無効です。確認してください。",
    "enterKey": "APIキーを入力してください",
    "getKeyAt": "キーを取得",
    "uiLanguage": "インターフェース言語",
    "summaryLanguage": "要約言語",
    "autoOpen": "スキル検出時にサイドバーを自動で開く",
    "darkMode": "ダークモード"
  },
  "ko": {
    "title": "Skill Viewer 설정",
    "sectionProvider": "AI 제공자",
    "sectionLanguage": "언어 설정",
    "sectionDisplay": "표시",
    "apiKey": "API 키",
    "testKey": "키 테스트",
    "save": "저장",
    "testing": "테스트 중...",
    "saving": "저장 중...",
    "settingsSaved": "설정이 저장되었습니다!",
    "keyValid": "API 키가 유효합니다!",
    "keyInvalid": "API 키가 유효하지 않습니다. 확인 후 다시 시도하세요.",
    "enterKey": "API 키를 먼저 입력하세요",
    "getKeyAt": "키 받기",
    "uiLanguage": "인터페이스 언어",
    "summaryLanguage": "요약 언어",
    "autoOpen": "스킬 발견 시 사이드바 자동 열기",
    "darkMode": "다크 모드"
  },
  "es": {
    "title": "Configuración de Skill Viewer",
    "sectionProvider": "Proveedor de IA",
    "sectionLanguage": "Configuración de Idioma",
    "sectionDisplay": "Pantalla",
    "apiKey": "Clave API",
    "testKey": "Probar Clave",
    "save": "Guardar",
    "testing": "Probando...",
    "saving": "Guardando...",
    "settingsSaved": "¡Configuración guardada!",
    "keyValid": "¡La clave API es válida!",
    "keyInvalid": "Clave API inválida. Por favor verifica e intenta de nuevo.",
    "enterKey": "Por favor ingresa una clave API primero",
    "getKeyAt": "Obtén tu clave en",
    "uiLanguage": "Idioma de Interfaz",
    "summaryLanguage": "Idioma de Resumen",
    "autoOpen": "Abrir barra lateral automáticamente al encontrar habilidades",
    "darkMode": "Modo oscuro"
  },
  "fr": {
    "title": "Paramètres Skill Viewer",
    "sectionProvider": "Fournisseur IA",
    "sectionLanguage": "Paramètres de Langue",
    "sectionDisplay": "Affichage",
    "apiKey": "Clé API",
    "testKey": "Tester la Clé",
    "save": "Enregistrer",
    "testing": "Test en cours...",
    "saving": "Enregistrement...",
    "settingsSaved": "Paramètres enregistrés !",
    "keyValid": "La clé API est valide !",
    "keyInvalid": "Clé API invalide. Veuillez vérifier et réessayer.",
    "enterKey": "Veuillez entrer une clé API d'abord",
    "getKeyAt": "Obtenez votre clé sur",
    "uiLanguage": "Langue de l'Interface",
    "summaryLanguage": "Langue du Résumé",
    "autoOpen": "Ouvrir automatiquement la barre latérale quand des compétences sont trouvées",
    "darkMode": "Mode sombre"
  },
  "de": {
    "title": "Skill Viewer Einstellungen",
    "sectionProvider": "KI-Anbieter",
    "sectionLanguage": "Spracheinstellungen",
    "sectionDisplay": "Anzeige",
    "apiKey": "API-Schlüssel",
    "testKey": "Schlüssel testen",
    "save": "Speichern",
    "testing": "Teste...",
    "saving": "Speichere...",
    "settingsSaved": "Einstellungen gespeichert!",
    "keyValid": "API-Schlüssel ist gültig!",
    "keyInvalid": "Ungültiger API-Schlüssel. Bitte überprüfen und erneut versuchen.",
    "enterKey": "Bitte geben Sie zuerst einen API-Schlüssel ein",
    "getKeyAt": "Holen Sie sich Ihren Schlüssel bei",
    "uiLanguage": "Oberflächensprache",
    "summaryLanguage": "Zusammenfassungssprache",
    "autoOpen": "Seitenleiste automatisch öffnen wenn Fähigkeiten gefunden werden",
    "darkMode": "Dunkler Modus"
  }
};

let currentLang = 'en';

function t(key) {
  return i18n[currentLang]?.[key] || i18n['en'][key] || key;
}

function updateUI() {
  document.getElementById('title').textContent = t('title');
  document.getElementById('section-provider').textContent = t('sectionProvider');
  document.getElementById('section-language').textContent = t('sectionLanguage');
  document.getElementById('section-display').textContent = t('sectionDisplay');
  document.getElementById('label-api-key').textContent = t('apiKey');
  document.getElementById('test-btn').textContent = t('testKey');
  document.getElementById('save-btn').textContent = t('save');
  document.getElementById('label-ui-language').textContent = t('uiLanguage');
  document.getElementById('label-summary-language').textContent = t('summaryLanguage');
  document.getElementById('label-auto-open').textContent = t('autoOpen');
  document.getElementById('label-dark-mode').textContent = t('darkMode');

  // Update key hint
  const provider = document.querySelector('input[name="provider"]:checked').value;
  const hint = document.getElementById('key-hint');
  const link = document.getElementById('key-link');
  hint.innerHTML = `${t('getKeyAt')} <a href="${PROVIDERS[provider].keyUrl}" target="_blank" id="key-link">${new URL(PROVIDERS[provider].keyUrl).hostname}</a>`;
}

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Load saved settings
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

  // Set UI language first
  currentLang = settings.uiLanguage || 'en';
  document.getElementById('ui-language').value = currentLang;
  document.getElementById('summary-language').value = settings.summaryLanguage || 'en';

  // Set provider
  const provider = settings.llmProvider || 'gemini';
  document.querySelector(`input[name="provider"][value="${provider}"]`).checked = true;

  // Set API key for current provider
  let apiKey = '';
  if (settings.providers?.[provider]?.apiKey) {
    apiKey = settings.providers[provider].apiKey;
  } else if (provider === 'gemini' && settings.geminiApiKey) {
    apiKey = settings.geminiApiKey;
  }
  document.getElementById('api-key').value = apiKey;
  document.getElementById('api-key').placeholder = PROVIDERS[provider].placeholder;

  // Set checkboxes
  document.getElementById('auto-open').checked = settings.autoOpen !== false;
  document.getElementById('dark-mode').checked = settings.darkMode === true;

  // Update UI text
  updateUI();

  // Bind events
  document.querySelectorAll('input[name="provider"]').forEach(radio => {
    radio.addEventListener('change', onProviderChange);
  });
  document.getElementById('ui-language').addEventListener('change', onUiLanguageChange);
  document.getElementById('summary-language').addEventListener('change', saveSummaryLanguage);
  document.getElementById('test-btn').addEventListener('click', testApiKey);
  document.getElementById('save-btn').addEventListener('click', saveSettings);
  document.getElementById('auto-open').addEventListener('change', saveCheckboxes);
  document.getElementById('dark-mode').addEventListener('change', saveCheckboxes);
}

async function onProviderChange(e) {
  const provider = e.target.value;

  // Update placeholder and link
  document.getElementById('api-key').placeholder = PROVIDERS[provider].placeholder;
  const hint = document.getElementById('key-hint');
  hint.innerHTML = `${t('getKeyAt')} <a href="${PROVIDERS[provider].keyUrl}" target="_blank">${new URL(PROVIDERS[provider].keyUrl).hostname}</a>`;

  // Load saved API key for this provider
  const settings = await chrome.storage.local.get(['providers', 'geminiApiKey']);
  let apiKey = '';
  if (settings.providers?.[provider]?.apiKey) {
    apiKey = settings.providers[provider].apiKey;
  } else if (provider === 'gemini' && settings.geminiApiKey) {
    apiKey = settings.geminiApiKey;
  }
  document.getElementById('api-key').value = apiKey;

  // Save selected provider
  await chrome.storage.local.set({ llmProvider: provider });
}

async function onUiLanguageChange(e) {
  currentLang = e.target.value;
  await chrome.storage.local.set({ uiLanguage: currentLang });
  updateUI();
}

async function saveSummaryLanguage() {
  const summaryLanguage = document.getElementById('summary-language').value;
  await chrome.storage.local.set({ summaryLanguage });
}

async function testApiKey() {
  const apiKey = document.getElementById('api-key').value.trim();
  const provider = document.querySelector('input[name="provider"]:checked').value;
  const testBtn = document.getElementById('test-btn');

  if (!apiKey) {
    showStatus(t('enterKey'), 'error');
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = t('testing');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TEST_API_KEY',
      provider,
      apiKey
    });

    if (response.valid) {
      showStatus(t('keyValid'), 'success');
    } else {
      showStatus(t('keyInvalid'), 'error');
    }
  } catch (err) {
    showStatus('Error: ' + err.message, 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = t('testKey');
  }
}

async function saveSettings() {
  const apiKey = document.getElementById('api-key').value.trim();
  const provider = document.querySelector('input[name="provider"]:checked').value;
  const saveBtn = document.getElementById('save-btn');

  saveBtn.disabled = true;
  saveBtn.textContent = t('saving');

  try {
    // Get existing providers
    const { providers = {} } = await chrome.storage.local.get('providers');

    // Update provider's API key
    providers[provider] = {
      ...(providers[provider] || {}),
      apiKey
    };

    await chrome.storage.local.set({
      llmProvider: provider,
      providers
    });

    showStatus(t('settingsSaved'), 'success');
  } catch (err) {
    showStatus('Error: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = t('save');
  }
}

async function saveCheckboxes() {
  const autoOpen = document.getElementById('auto-open').checked;
  const darkMode = document.getElementById('dark-mode').checked;
  await chrome.storage.local.set({ autoOpen, darkMode });
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  setTimeout(() => {
    statusEl.className = 'status';
  }, 3000);
}
```

**Step 2: Commit**

```bash
git add extension/options.js
git commit -m "feat: implement multi-provider and i18n support in options page"
```

---

## Task 10: Final Integration & Testing

**Files:**
- All modified files

**Step 1: Review all changes**

Run `git log --oneline -10` to verify all commits.

**Step 2: Manual testing checklist**

1. Load extension at chrome://extensions (Developer mode)
2. Go to a GitHub repo with Claude skills
3. Test settings link - should open options page
4. Test sidebar resize - drag left edge, verify 250-600px bounds
5. Test provider switching - select OpenAI, verify key hint changes
6. Test API key save/test for each provider
7. Test UI language change - select Chinese, verify UI updates
8. Test summary language - select Japanese, verify summaries in Japanese
9. Verify sidebar width persists after page refresh

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete skill viewer v1.1.0 enhancements

- Fix settings page not opening from sidebar
- Add draggable sidebar width (250-600px)
- Add multi-provider LLM support (Gemini, OpenAI, Claude)
- Add separate UI and summary language settings
- Support 8 languages for UI

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Fix settings page bug | content.js, background.js |
| 2 | Add resize handle CSS | sidebar.css |
| 3 | Implement draggable sidebar | content.js |
| 4 | Create i18n translations | lib/i18n.js |
| 5 | Create multi-provider module | lib/providers.js |
| 6 | Update background worker | background.js |
| 7 | Update manifest | manifest.json |
| 8 | Redesign options HTML | options.html |
| 9 | Rewrite options JS | options.js |
| 10 | Final integration test | all files |
