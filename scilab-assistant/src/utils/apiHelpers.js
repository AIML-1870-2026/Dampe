import { SYSTEM_PROMPT } from './prompts.js';

async function handleResponse(response) {
  if (!response.ok) {
    let errMsg = `API error: ${response.status}`;
    try {
      const err = await response.json();
      errMsg = err.error?.message || err.message || errMsg;
    } catch {
      // leave default message
    }
    if (response.status === 401) throw new Error('API key is missing or invalid. Please check your key and try again.');
    if (response.status === 429) throw new Error("You've hit the API rate limit. Please wait a moment and try again.");
    if (response.status >= 500) throw new Error('The AI service is temporarily unavailable. Please try again later.');
    throw new Error(errMsg);
  }
  return response.json();
}

export async function callAnthropic({ apiKey, model, userPrompt }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const data = await handleResponse(response);
  const content = data.content?.[0];
  if (content?.type !== 'text') throw new Error('The AI returned an unexpected response. Please try again.');
  return content.text;
}

export async function callOpenAI({ apiKey, model, userPrompt }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  const data = await handleResponse(response);
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('The AI returned an unexpected response. Please try again.');
  return text;
}

export async function callGemini({ apiKey, model, userPrompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: userPrompt }] }],
    }),
  });

  const data = await handleResponse(response);
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('The AI returned an unexpected response. Please try again.');
  return text;
}

export async function callLLM({ provider, apiKey, model, userPrompt }) {
  if (!apiKey) throw new Error('API key is missing or invalid. Please check your key and try again.');

  try {
    switch (provider) {
      case 'anthropic': return await callAnthropic({ apiKey, model, userPrompt });
      case 'openai':    return await callOpenAI({ apiKey, model, userPrompt });
      case 'google':    return await callGemini({ apiKey, model, userPrompt });
      default:          throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Could not connect. Please check your internet connection.');
    }
    throw err;
  }
}
