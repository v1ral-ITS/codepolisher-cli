import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync, renameSync, unlinkSync } from 'fs';
import { execFileSync } from 'child_process';
import { randomUUID } from 'crypto';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.codepolisher');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function currentWindowsIdentity() {
  const { USERDOMAIN, USERNAME } = process.env;
  if (USERDOMAIN && USERNAME) return `${USERDOMAIN}\\${USERNAME}`;
  return execFileSync('whoami', [], {
    encoding: 'utf8',
    windowsHide: true,
  }).trim();
}

function windowsAclSids(path) {
  const script = `
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$acl = Get-Acl -LiteralPath $env:CODEPOLISHER_SECURE_PATH
$currentSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
Write-Output $currentSid
foreach ($entry in $acl.Access) {
  try {
    Write-Output $entry.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
  } catch {
    Write-Output $entry.IdentityReference.Value
  }
}
`;
  const encodedCommand = Buffer.from(script, 'utf16le').toString('base64');
  const output = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encodedCommand], {
    encoding: 'utf8',
    windowsHide: true,
    env: { ...process.env, CODEPOLISHER_SECURE_PATH: path },
  });
  const [currentSid, ...aclSids] = output.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
  return { currentSid, aclSids: [...new Set(aclSids)] };
}

function securePath(path, isDirectory = false) {
  try {
    if (process.platform === 'win32') {
      const identity = currentWindowsIdentity();
      const grant = isDirectory ? `${identity}:(OI)(CI)F` : `${identity}:(F)`;
      execFileSync('icacls', [path, '/inheritance:r', '/grant:r', grant], {
        stdio: 'ignore',
        windowsHide: true,
      });

      const before = windowsAclSids(path);
      for (const sid of before.aclSids) {
        if (sid !== before.currentSid) {
          const account = /^S-\d(?:-\d+)+$/.test(sid) ? `*${sid}` : sid;
          execFileSync('icacls', [path, '/remove', account], {
            stdio: 'ignore',
            windowsHide: true,
          });
        }
      }

      const after = windowsAclSids(path);
      if (after.aclSids.some(sid => sid !== after.currentSid)) {
        throw new Error('Windows retained an access rule for another account');
      }
    } else {
      chmodSync(path, isDirectory ? 0o700 : 0o600);
    }
  } catch (error) {
    throw new Error(`Could not secure CodePolisher config permissions for ${path}: ${error.message}`);
  }
}

// Supported providers
export const PROVIDERS = [
  'openai',
  'anthropic',
  'gemini',
  'deepseek',
  'venice',
  'groq',
  'openrouter',
  'ollama',
];

export const PROVIDER_ENV_KEYS = {
  openai:    'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini:    'GEMINI_API_KEY',
  deepseek:  'DEEPSEEK_API_KEY',
  venice:    'VENICE_API_KEY',
  groq:      'GROQ_API_KEY',
  openrouter:'OPENROUTER_API_KEY',
  ollama:    null, // local, no key needed
};

export const DEFAULT_MODELS = {
  openai:    { small: 'gpt-4o-mini',                  large: 'gpt-4o' },
  anthropic: { small: 'claude-3-5-haiku-20241022',    large: 'claude-sonnet-4-5' },
  gemini:    { small: 'gemini-1.5-flash',             large: 'gemini-1.5-pro' },
  deepseek:  { small: 'deepseek-chat',                large: 'deepseek-chat' },
  venice:    { small: 'zai-org-glm-5-1',              large: 'zai-org-glm-5-1' },
  groq:      { small: 'openai/gpt-oss-20b',           large: 'openai/gpt-oss-120b' },
  openrouter:{ small: null,                            large: null },
  ollama:    { small: 'llama3.2',                     large: 'llama3.2' },
};

export function loadConfig() {
  let fromFile = {};
  if (existsSync(CONFIG_FILE)) {
    try {
      fromFile = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    } catch {
      // ignore malformed config
    }
  }

  // Determine provider (file > env fallback)
  const savedProvider = PROVIDERS.includes(fromFile.provider) ? fromFile.provider : null;
  const provider = savedProvider || _detectProviderFromEnv() || 'openai';

  // API key: provider-specific file entry > legacy file entry > environment.
  const envKey = PROVIDER_ENV_KEYS[provider];
  const providerApiKey = fromFile.api_keys?.[provider] || null;
  const api_key = providerApiKey || fromFile.api_key || (envKey ? process.env[envKey] : null) || null;
  const api_key_source = providerApiKey
    ? 'config'
    : fromFile.api_key
      ? 'legacy-config'
      : envKey && process.env[envKey]
        ? envKey
        : null;

  return {
    provider,
    api_key,
    api_key_source,
    model:       fromFile.model       || null,
    ollama_host: fromFile.ollama_host || 'http://localhost:11434',
  };
}

function _detectProviderFromEnv() {
  if (process.env.OPENAI_API_KEY)    return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.GEMINI_API_KEY)    return 'gemini';
  if (process.env.DEEPSEEK_API_KEY)  return 'deepseek';
  if (process.env.VENICE_API_KEY)    return 'venice';
  if (process.env.GROQ_API_KEY)      return 'groq';
  if (process.env.OPENROUTER_API_KEY)return 'openrouter';
  return null;
}

export function saveConfig(updates) {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
  securePath(CONFIG_DIR, true);
  let existing = {};
  if (existsSync(CONFIG_FILE)) {
    try { existing = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')); } catch { /**/ }
  }
  const next = { ...existing, ...updates };
  const tempFile = join(CONFIG_DIR, `config.${process.pid}.${randomUUID()}.tmp`);
  try {
    writeFileSync(tempFile, JSON.stringify(next, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });
    securePath(tempFile);
    try {
      renameSync(tempFile, CONFIG_FILE);
    } catch (error) {
      if (process.platform !== 'win32' || !existsSync(CONFIG_FILE)) throw error;
      unlinkSync(CONFIG_FILE);
      renameSync(tempFile, CONFIG_FILE);
    }
    securePath(CONFIG_FILE);
  } finally {
    if (existsSync(tempFile)) unlinkSync(tempFile);
  }
  return next;
}

export function saveProviderApiKey(provider, apiKey) {
  let existing = {};
  if (existsSync(CONFIG_FILE)) {
    try { existing = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')); } catch { /**/ }
  }
  return saveConfig({
    api_key: null,
    api_keys: { ...(existing.api_keys || {}), [provider]: apiKey },
  });
}

export function requireConfig() {
  const config = loadConfig();
  const { provider } = config;

  // Check if the user has explicitly saved a provider in the config file
  let savedConfig = {};
  if (existsSync(CONFIG_FILE)) {
    try { savedConfig = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')); } catch { /**/ }
  }
  const providerExplicitlySet = PROVIDERS.includes(savedConfig.provider);

  if (provider === 'ollama') {
    // no key required
  } else {
    if (!config.api_key) {
      // If no provider was explicitly chosen, show the full onboarding list
      if (!providerExplicitlySet) {
        console.error('\nNo AI provider configured. Choose one and get started:\n');
        console.error('  Provider       Set API key via                          Config command');
        console.error('  ─────────────────────────────────────────────────────────────────────────');
        console.error('  openai         OPENAI_API_KEY env var                   codepolisher config set provider openai');
        console.error('  anthropic      ANTHROPIC_API_KEY env var                codepolisher config set provider anthropic');
        console.error('  gemini         GEMINI_API_KEY env var                   codepolisher config set provider gemini');
        console.error('  deepseek       DEEPSEEK_API_KEY env var                 codepolisher config set provider deepseek');
        console.error('  venice        VENICE_API_KEY env var                  codepolisher config set provider venice');
        console.error('  groq           GROQ_API_KEY env var                     codepolisher config set provider groq');
        console.error('  openrouter     OPENROUTER_API_KEY env var               codepolisher config set provider openrouter');
        console.error('  ollama         (no key needed — runs locally)           codepolisher config set provider ollama');
        console.error('\nThen set your key:  codepolisher config set api-key <your-key>');
        console.error('Or just export the env var and run again.\n');
      } else {
        const envKey = PROVIDER_ENV_KEYS[provider];
        console.error(`\nNo API key found for provider "${provider}".\nRun: codepolisher config set api-key <key>\nOr set the ${envKey} environment variable.\n`);
      }
      process.exit(1);
    }
  }

  return config;
}
