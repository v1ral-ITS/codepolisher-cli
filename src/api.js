import { DEFAULT_MODELS } from './config.js';

// ---------------------------------------------------------------------------
// JSON extraction helper — handles plain JSON or markdown-fenced JSON blocks
// ---------------------------------------------------------------------------
function extractJSON(text) {
  // Try direct parse first
  try { return JSON.parse(text); } catch { /**/ }
  // Strip markdown code fence
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try { return JSON.parse(match[1].trim()); } catch { /**/ }
  }
  // Last resort: find first { ... } block
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch { /**/ }
  }
  throw new Error('Could not parse JSON from model response.\n\nRaw response:\n' + text.slice(0, 500));
}

function pickModel(config, codeLines) {
  if (config.model) return config.model;
  const tier = codeLines > 400 ? 'large' : 'small';
  return DEFAULT_MODELS[config.provider]?.[tier] || null;
}

const OPENAI_COMPATIBLE_PROVIDERS = {
  openai: {
    label: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
  },
  deepseek: {
    label: 'DeepSeek',
    url: 'https://api.deepseek.com/chat/completions',
  },
  venice: {
    label: 'Venice',
    url: 'https://api.venice.ai/api/v1/chat/completions',
  },
  groq: {
    label: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
  },
  openrouter: {
    label: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    headers: {
      'HTTP-Referer': 'https://codepolisher.app',
      'X-OpenRouter-Title': 'CodePolisher CLI',
    },
  },
};

// ---------------------------------------------------------------------------
// Provider implementations
// ---------------------------------------------------------------------------

async function callOpenAICompatible(config, prompt, codeLines) {
  const provider = OPENAI_COMPATIBLE_PROVIDERS[config.provider];
  const model = pickModel(config, codeLines);
  const res = await fetch(provider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.api_key}`,
      ...(provider.headers || {}),
    },
    body: JSON.stringify({
      ...(model ? { model } : {}),
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`${provider.label} error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return extractJSON(data.choices[0].message.content);
}

async function callAnthropic(config, prompt, codeLines) {
  const model = pickModel(config, codeLines) || 'claude-3-5-haiku-20241022';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.api_key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return extractJSON(data.content[0].text);
}

async function callGemini(config, prompt, codeLines) {
  const model = pickModel(config, codeLines) || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.api_key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return extractJSON(data.candidates[0].content.parts[0].text);
}

async function callOllama(config, prompt, codeLines) {
  const model = pickModel(config, codeLines) || 'llama3.2';
  const host = config.ollama_host || 'http://localhost:11434';
  const res = await fetch(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      format: 'json',
      stream: false,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return extractJSON(data.message.content);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
export async function invokeLLM(config, { prompt, codeLines = 0 }) {
  if (OPENAI_COMPATIBLE_PROVIDERS[config.provider]) {
    return callOpenAICompatible(config, prompt, codeLines);
  }
  switch (config.provider) {
    case 'anthropic': return callAnthropic(config, prompt, codeLines);
    case 'gemini':    return callGemini(config, prompt, codeLines);
    case 'ollama':    return callOllama(config, prompt, codeLines);
    default:
      throw new Error(`Unknown provider "${config.provider}". Run: codepolisher config set provider <name>`);
  }
}
