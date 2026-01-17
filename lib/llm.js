// lib/llm.js

const LANGUAGE_NAMES = {
  "en": "English",
  "zh-CN": "Simplified Chinese",
  "zh-TW": "Traditional Chinese",
  "ja": "Japanese",
  "ko": "Korean",
  "es": "Spanish",
  "fr": "French",
  "de": "German"
};

function buildPrompt(skillName, skillContent, language) {
  const langInstruction = language && language !== 'en'
    ? `\n\nRespond in ${LANGUAGE_NAMES[language] || 'English'}.`
    : '';

  return `You are summarizing a Claude Code skill for developers browsing GitHub.

Skill name: ${skillName}
Skill content:
---
${skillContent}
---

Analyze the skill and provide a summary in this exact format:

**Line 1 - Capability badges (only include ones that apply, separated by " | "):**
- ⚠️ Code Execution - ONLY if the skill contains actual executable code (bash commands, scripts, code blocks that will run). Do NOT include this badge just because the skill documentation mentions "code", "bash", or "command" in explanatory text.
- ⚠️ External Access - if the skill calls external APIs, fetches URLs, or accesses network resources
- 📁 File Operations - if the skill reads, writes, or modifies files

**Line 2+ - Description (2-3 sentences):**
What does this skill do and when should a developer use it? Keep it practical and scannable.

Example output format:
⚠️ Code Execution | 📁 File Operations

Automates git commit workflows with AI-generated messages. Use when you want consistent, descriptive commits without writing messages manually.${langInstruction}`;
}

export async function summarizeWithGemini(skillName, skillContent, language) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: buildPrompt(skillName, skillContent, language) }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 400
      }
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Empty response from Gemini');
  }

  return data.candidates[0].content.parts[0].text.trim();
}
