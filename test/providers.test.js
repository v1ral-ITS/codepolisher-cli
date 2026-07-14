import test from 'node:test';
import assert from 'node:assert/strict';
import { invokeLLM } from '../src/api.js';
import { PROVIDERS, PROVIDER_ENV_KEYS } from '../src/config.js';

const providerCases = [
  ['venice', 'https://api.venice.ai/api/v1/chat/completions', 'zai-org-glm-5-1'],
  ['groq', 'https://api.groq.com/openai/v1/chat/completions', 'openai/gpt-oss-20b'],
  ['openrouter', 'https://openrouter.ai/api/v1/chat/completions', undefined],
];

for (const [provider, expectedUrl, expectedModel] of providerCases) {
  test(`${provider} uses its documented OpenAI-compatible endpoint`, async () => {
    const originalFetch = globalThis.fetch;
    let request;
    globalThis.fetch = async (url, options) => {
      request = { url, options };
      return new Response(JSON.stringify({
        choices: [{ message: { content: '{"summary":"ok","comments":[]}' } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    try {
      const result = await invokeLLM(
        { provider, api_key: 'test-key', model: null },
        { prompt: 'Return JSON', codeLines: 10 },
      );
      const body = JSON.parse(request.options.body);

      assert.equal(request.url, expectedUrl);
      assert.equal(request.options.headers.Authorization, 'Bearer test-key');
      assert.equal(body.model, expectedModel);
      assert.equal(result.summary, 'ok');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}

test('new providers expose conventional environment variable names', () => {
  assert.ok(PROVIDERS.includes('venice'));
  assert.equal(PROVIDER_ENV_KEYS.venice, 'VENICE_API_KEY');
  assert.equal(PROVIDER_ENV_KEYS.groq, 'GROQ_API_KEY');
  assert.equal(PROVIDER_ENV_KEYS.openrouter, 'OPENROUTER_API_KEY');
});
