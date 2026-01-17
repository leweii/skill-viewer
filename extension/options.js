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

// Cloud service configuration
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
const CLOUD_API_URL = 'https://skill-viewer-api.vercel.app';

async function initCloudUI() {
  const { cloudAuth } = await chrome.storage.local.get(['cloudAuth']);

  if (cloudAuth?.user) {
    showLoggedInState(cloudAuth);
    fetchUsage(cloudAuth.accessToken);
  } else {
    showLoggedOutState();
  }
}

function showLoggedOutState() {
  document.getElementById('cloud-logged-out').style.display = 'block';
  document.getElementById('cloud-logged-in').style.display = 'none';
}

function showLoggedInState(auth) {
  document.getElementById('cloud-logged-out').style.display = 'none';
  document.getElementById('cloud-logged-in').style.display = 'block';
  document.getElementById('cloud-user-info').textContent = `Logged in as ${auth.user.email}`;
}

async function fetchUsage(token) {
  try {
    const response = await fetch(`${CLOUD_API_URL}/api/usage`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();

    const remaining = data.dailyLimit - data.dailyUsage;
    const status = data.isPaid ? 'Pro' : 'Free';
    document.getElementById('cloud-usage-info').textContent =
      `${status}: ${remaining}/${data.dailyLimit} remaining today`;

    if (!data.isPaid) {
      document.getElementById('upgrade-btn').style.display = 'inline-block';
    }
  } catch (err) {
    console.error('Failed to fetch usage:', err);
  }
}

// Add event listeners for cloud service
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await chrome.storage.local.remove(['cloudAuth']);
  showLoggedOutState();
});

document.getElementById('upgrade-btn')?.addEventListener('click', () => {
  window.open('https://YOUR_LEMONSQUEEZY_URL', '_blank');
});

// Initialize cloud UI
initCloudUI();

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
    "title": "Configuracion de Skill Viewer",
    "sectionProvider": "Proveedor de IA",
    "sectionLanguage": "Configuracion de Idioma",
    "sectionDisplay": "Pantalla",
    "apiKey": "Clave API",
    "testKey": "Probar Clave",
    "save": "Guardar",
    "testing": "Probando...",
    "saving": "Guardando...",
    "settingsSaved": "Configuracion guardada!",
    "keyValid": "La clave API es valida!",
    "keyInvalid": "Clave API invalida. Por favor verifica e intenta de nuevo.",
    "enterKey": "Por favor ingresa una clave API primero",
    "getKeyAt": "Obten tu clave en",
    "uiLanguage": "Idioma de Interfaz",
    "summaryLanguage": "Idioma de Resumen",
    "autoOpen": "Abrir barra lateral automaticamente al encontrar habilidades",
    "darkMode": "Modo oscuro"
  },
  "fr": {
    "title": "Parametres Skill Viewer",
    "sectionProvider": "Fournisseur IA",
    "sectionLanguage": "Parametres de Langue",
    "sectionDisplay": "Affichage",
    "apiKey": "Cle API",
    "testKey": "Tester la Cle",
    "save": "Enregistrer",
    "testing": "Test en cours...",
    "saving": "Enregistrement...",
    "settingsSaved": "Parametres enregistres !",
    "keyValid": "La cle API est valide !",
    "keyInvalid": "Cle API invalide. Veuillez verifier et reessayer.",
    "enterKey": "Veuillez entrer une cle API d'abord",
    "getKeyAt": "Obtenez votre cle sur",
    "uiLanguage": "Langue de l'Interface",
    "summaryLanguage": "Langue du Resume",
    "autoOpen": "Ouvrir automatiquement la barre laterale quand des competences sont trouvees",
    "darkMode": "Mode sombre"
  },
  "de": {
    "title": "Skill Viewer Einstellungen",
    "sectionProvider": "KI-Anbieter",
    "sectionLanguage": "Spracheinstellungen",
    "sectionDisplay": "Anzeige",
    "apiKey": "API-Schlussel",
    "testKey": "Schlussel testen",
    "save": "Speichern",
    "testing": "Teste...",
    "saving": "Speichere...",
    "settingsSaved": "Einstellungen gespeichert!",
    "keyValid": "API-Schlussel ist gultig!",
    "keyInvalid": "Ungultiger API-Schlussel. Bitte uberprufen und erneut versuchen.",
    "enterKey": "Bitte geben Sie zuerst einen API-Schlussel ein",
    "getKeyAt": "Holen Sie sich Ihren Schlussel bei",
    "uiLanguage": "Oberflachensprache",
    "summaryLanguage": "Zusammenfassungssprache",
    "autoOpen": "Seitenleiste automatisch offnen wenn Fahigkeiten gefunden werden",
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
  hint.innerHTML = `${t('getKeyAt')} <a href="${PROVIDERS[provider].keyUrl}" target="_blank">${new URL(PROVIDERS[provider].keyUrl).hostname}</a>`;
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
