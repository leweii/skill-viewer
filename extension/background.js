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
