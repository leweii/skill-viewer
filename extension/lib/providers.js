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
  module.exports = { PROVIDERS, summarizeSkill, testApiKey, buildPrompt, getLanguageName };
}
