<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:6366f1,100:a855f7&height=160&section=header&text=CodePolisher%20CLI&fontSize=48&fontColor=ffffff&fontAlignY=38&desc=AI-powered%20code%20review%20from%20your%20terminal&descAlignY=58&descSize=16" width="100%" />

<br/>

[![Node.js 18+](https://img.shields.io/badge/node.js-18+-6366f1?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-a855f7?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-4%20passing-22c55e?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/v1ral-ITS/codepolisher-cli/actions/workflows/test.yml)
[![Providers](https://img.shields.io/badge/AI%20providers-8-f59e0b?style=for-the-badge)](#supported-providers)
[![npm](https://img.shields.io/npm/v/codepolisher-cli?style=for-the-badge&logo=npm&logoColor=white&color=cb3837)](https://www.npmjs.com/package/codepolisher-cli)
[![npm downloads](https://img.shields.io/npm/dm/codepolisher-cli?style=for-the-badge&color=3b82f6)](https://www.npmjs.com/package/codepolisher-cli)

<br/>

> **Polish code. Catch issues. Ship with confidence.**
> Review files or piped source with the AI provider you already use—without tying your workflow to a hosted backend.

<br/>

</div>

---

## Table of Contents

- [How it works](#how-it-works)
- [Supported Providers](#supported-providers)
- [Install](#install)
- [Usage](#usage)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Security](#security)
- [Development](#development)

---

## How it works

CodePolisher reads a file or standard input, builds a focused review prompt, sends it directly to your selected provider, and renders structured findings for a human or CI pipeline.

```
  Source Code           Review Pipeline             Result
 ┌──────────────┐     ┌────────────────────┐     ┌─────────────────┐
 │ file.js      │────▶│ Detect language    │────▶│ Summary         │
 │ script.py    │────▶│ Apply focus/rules  │────▶│ Inline findings │
 │ stdin pipe   │────▶│ Call your provider │────▶│ JSON or terminal│
 └──────────────┘     └────────────────────┘     └─────────────────┘
```

Your provider key stays under your control. CodePolisher CLI does not require Base44 and does not proxy reviews through the CodePolisher website.

---

## Supported Providers

| Provider | Config name | Environment variable | Default model |
|----------|-------------|----------------------|---------------|
| OpenAI | `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` | `claude-3-5-haiku-20241022` |
| Google Gemini | `gemini` | `GEMINI_API_KEY` | `gemini-1.5-flash` |
| DeepSeek | `deepseek` | `DEEPSEEK_API_KEY` | `deepseek-chat` |
| Venice.ai | `venice` | `VENICE_API_KEY` | `zai-org-glm-5-1` |
| Groq | `groq` | `GROQ_API_KEY` | `openai/gpt-oss-20b` |
| OpenRouter | `openrouter` | `OPENROUTER_API_KEY` | Account default |
| Ollama | `ollama` | None required | `llama3.2` |

Larger files automatically use the provider's configured large-file model unless you set an explicit model.

---

## Install

### From npm

CodePolisher CLI is officially published on the public npm registry.

```bash
npm install -g codepolisher-cli
```

### From source

```bash
git clone https://github.com/v1ral-ITS/codepolisher-cli.git
cd codepolisher-cli
npm install
npm link
```

> **Requires:** Node.js 18 or newer

---

## Usage

```bash
# Review a file
codepolisher review src/index.js

# Review piped code
cat src/index.js | codepolisher review --language javascript

# Focus the review
codepolisher review app.py --focus security,performance

# Run a security audit
codepolisher review server.js --security

# Apply project-specific rules
codepolisher review api.ts --rules "Require error handling and input validation."

# Emit machine-readable output for CI
codepolisher review app.js --output json --fail-on-critical
```

### Review controls

| Option | Purpose |
|--------|---------|
| `--language <lang>` | Supply a language hint |
| `--focus <areas>` | Focus on security, performance, readability, error handling, best practices, or testing |
| `--rules <text>` | Add custom review rules |
| `--strict` | Flag every issue |
| `--security` | Run a security-focused audit |
| `--output json` | Produce JSON for scripts and CI |
| `--fail-on-critical` | Exit with code 1 when critical issues are found |

---

## Configuration

```bash
# Choose a provider
codepolisher config set provider openai

# Save a provider-specific API key
codepolisher config set api-key <your-key>

# Optionally override the model
codepolisher config set model gpt-4o

# Inspect or clear configuration
codepolisher config get
codepolisher config clear
```

Environment variables work without a local configuration file, so CI can inject provider keys through repository secrets.

For Ollama, no API key is required:

```bash
codepolisher config set provider ollama
codepolisher config set model llama3.2
codepolisher config set ollama-host http://localhost:11434
```

---

## Architecture

<details>
<summary>View project structure</summary>

```
bin/
└── codepolisher.js          # Executable entry point
src/
├── index.js                 # Commander program and commands
├── api.js                   # Provider adapters and response parsing
├── config.js                # Provider detection and secure local config
├── prompt.js                # Review and security prompt builders
├── display.js               # Human-readable terminal output
└── commands/
    ├── review.js            # File/stdin review workflow
    └── config-cmd.js        # Configuration commands
test/
└── providers.test.js        # Provider endpoint and environment tests
```

</details>

### Design principles

- 🔌 **Provider-independent** — use a cloud provider, an aggregator, or local Ollama
- 🔐 **Keys stay yours** — environment variables are first-class and saved keys are provider-specific
- 🧰 **Terminal-native** — review files, pipes, and CI jobs without a browser
- 🤖 **Automation-ready** — structured JSON and meaningful failure exit codes
- 🧩 **Extensible** — provider adapters and prompts are isolated by responsibility

---

## Security

Saved configuration lives in `~/.codepolisher/config.json`. CodePolisher applies restrictive permissions on macOS and Linux and a private current-user ACL on Windows. It fails instead of silently saving when those protections cannot be applied.

For CI and shared machines, prefer provider environment variables and your platform's encrypted secret store.

---

## Development

```bash
# Install exact dependencies
npm ci

# Run the test suite
npm test

# Exercise the CLI locally
node bin/codepolisher.js --help

# Verify the package contents before publishing
npm pack --dry-run
```

Tests run on Node.js 18, 20, and 22 through GitHub Actions.

---

## License

[MIT](LICENSE) — use it however you want.

---

<div align="center">

<br/>

<img src="https://i.ibb.co/gFJwwVL4/ITSolutions-LOGO.jpg" alt="ImPerial TeK. Solutions" width="120" />

<br/>

**Bear Carrington**

*Founder | ImPerial TeK. Solutions (ITSolutions)*

📧 [ITSolutions_MGNT@proton.me](mailto:ITSolutions_MGNT@proton.me) &nbsp;·&nbsp; 🌐 [codepolisher.app](https://codepolisher.app)

<br/>

*Innovating technology with precision and integrity.*

© ImPerial TeK. Solutions — All Rights Reserved

<br/>

*If CodePolisher CLI improved your workflow, consider giving it a star ⭐*

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:a855f7,100:6366f1&height=80&section=footer" width="100%" />

</div>
