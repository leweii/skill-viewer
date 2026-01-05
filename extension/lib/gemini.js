// Gemini API client

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function buildPrompt(skillName, skillContent) {
  return `You are summarizing a Claude Code skill for developers browsing GitHub.

Skill name: ${skillName}
Skill content:
---
${skillContent}
---

Provide a concise summary (2-3 sentences) that answers:
1. What does this skill do?
2. When should a developer use it?

Keep it practical and scannable. No markdown formatting.`;
}

async function summarizeSkill(apiKey, skillName, skillContent) {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: buildPrompt(skillName, skillContent)
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200
      }
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 400) {
      throw new Error('Invalid API key');
    }
    if (response.status === 429) {
      throw new Error('Rate limited');
    }
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Empty response from Gemini');
  }

  return data.candidates[0].content.parts[0].text.trim();
}

// Export for use in background.js
if (typeof module !== 'undefined') {
  module.exports = { summarizeSkill };
}
