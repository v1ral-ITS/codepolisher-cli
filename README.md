# CodePolisher CLI

AI-powered code review in your terminal — by ImPerial TeK. Solutions

```
npm install -g codepolisher-cli
```

---

## Quick Start

Pick a provider, set your key, and review code:

```bash
codepolisher config set provider openai
codepolisher config set api-key <your-key>
codepolisher review myfile.js
```

Or if your API key is already in an environment variable, just run `codepolisher review` — no config needed.

---

## Supported Providers

| Provider | Config name | Auto-detected env var |
|---|---|---|
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Anthropic (Claude) | `anthropic` | `ANTHROPIC_API_KEY` |
| Google Gemini | `gemini` | `GEMINI_API_KEY` |
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` |
| Venice.ai | `venice` | `VENICE_API_KEY` |
| Groq | `groq` | `GROQ_API_KEY` |
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY` |
| Ollama (local) | `ollama` | *(no key needed)* |

If any of those env vars are already set on your machine, CodePolisher will pick up the provider automatically — no extra config required.

---

## Configuration

```bash
# Set provider
codepolisher config set provider anthropic

# Set API key
codepolisher config set api-key <your-key>

# Override the model (optional — each provider has sensible defaults)
codepolisher config set model claude-3-5-sonnet-20241022

# Show current config
codepolisher config get

# Clear all saved config
codepolisher config clear
```

API keys saved with `config set api-key` are stored per provider, so switching
providers will not reuse a key from another service. Environment variables are
recommended for CI and shared machines.

CodePolisher protects `~/.codepolisher` and `config.json` whenever configuration
is saved. It uses `0700`/`0600` permissions on macOS and Linux, and a private
current-user ACL on Windows. The command fails instead of silently saving when
those permissions cannot be applied.

### Venice.ai

```bash
codepolisher config set provider venice
codepolisher config set api-key <your-venice-api-key>
codepolisher review myfile.js
```

You can also set `VENICE_API_KEY` and skip saving a key in the CLI config.

### Default models per provider

| Provider | Small files | Large files (400+ lines) |
|---|---|---|
| openai | `gpt-4o-mini` | `gpt-4o` |
| anthropic | `claude-3-5-haiku-20241022` | `claude-sonnet-4-5` |
| gemini | `gemini-1.5-flash` | `gemini-1.5-pro` |
| deepseek | `deepseek-chat` | `deepseek-chat` |
| venice | `zai-org-glm-5-1` | `zai-org-glm-5-1` |
| groq | `openai/gpt-oss-20b` | `openai/gpt-oss-120b` |
| openrouter | Account default | Account default |
| ollama | `llama3.2` | `llama3.2` |

### Ollama (local AI, no API key)

```bash
codepolisher config set provider ollama
codepolisher config set model llama3.2        # or any model you have pulled
codepolisher config set ollama-host http://localhost:11434   # default
```

---

## Usage

```bash
# Review a file
codepolisher review myfile.py

# Review with focus areas
codepolisher review myfile.js --focus security,performance

# Full security audit
codepolisher review myfile.js --security

# Strict mode — flag everything
codepolisher review myfile.js --strict

# Custom rules
codepolisher review myfile.js --rules "No var declarations. All functions must have error handling."

# Language hint
codepolisher review myfile --language typescript

# JSON output (for piping / CI)
codepolisher review myfile.js --output json

# Exit code 1 if critical issues found (useful in CI pipelines)
codepolisher review myfile.js --fail-on-critical

# Pipe code via stdin
cat myfile.js | codepolisher review
```

---

## CI / GitHub Actions example

```yaml
- name: Code review
  run: codepolisher review src/index.js --fail-on-critical
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

Config is stored at `~/.codepolisher/config.json`.
