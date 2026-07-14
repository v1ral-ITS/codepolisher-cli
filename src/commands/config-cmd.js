import { loadConfig, saveConfig, saveProviderApiKey, PROVIDERS, PROVIDER_ENV_KEYS, DEFAULT_MODELS } from '../config.js';
import chalk from 'chalk';

const ALLOWED_KEYS = {
  'provider':     'provider',
  'api-key':      'api_key',
  'model':        'model',
  'ollama-host':  'ollama_host',
};

export function configCommand(program) {
  const cmd = program
    .command('config')
    .description('Manage CodePolisher CLI configuration');

  cmd
    .command('set <key> <value>')
    .description(`Set a config value. Keys: ${Object.keys(ALLOWED_KEYS).join(', ')}`)
    .action((key, value) => {
      if (!ALLOWED_KEYS[key]) {
        console.error(chalk.red(`Unknown key "${key}".`));
        console.error(chalk.dim(`Valid keys: ${Object.keys(ALLOWED_KEYS).join(', ')}`));
        process.exit(1);
      }
      if (key === 'provider' && !PROVIDERS.includes(value)) {
        console.error(chalk.red(`Unknown provider "${value}".`));
        console.error(chalk.dim(`Valid providers: ${PROVIDERS.join(', ')}`));
        process.exit(1);
      }
      if (key === 'api-key') {
        saveProviderApiKey(loadConfig().provider, value);
      } else {
        saveConfig({ [ALLOWED_KEYS[key]]: value });
      }
      console.log(chalk.green(`✔ Saved ${key}`));
    });

  cmd
    .command('get')
    .description('Show current config')
    .action(() => {
      const config = loadConfig();
      const envKey = PROVIDER_ENV_KEYS[config.provider];
      const defaultModel = DEFAULT_MODELS[config.provider]?.small || '(provider default)';
      console.log('');
      console.log(`  ${chalk.dim('provider')}     ${chalk.cyan(config.provider)}`);
      const keyStatus = config.api_key
        ? config.api_key_source === envKey
          ? chalk.green(`[set via ${envKey}]`)
          : chalk.green('[set in config]')
        : envKey
          ? chalk.yellow(`(set ${envKey} or run config set api-key)`)
          : chalk.dim('(not required)');
      console.log(`  ${chalk.dim('api-key')}      ${keyStatus}`);
      console.log(`  ${chalk.dim('model')}        ${config.model ? chalk.cyan(config.model) : chalk.dim(`(default: ${defaultModel})`)}`);
      if (config.provider === 'ollama') {
        console.log(`  ${chalk.dim('ollama-host')}  ${chalk.cyan(config.ollama_host)}`);
      }
      console.log('');
      console.log(chalk.dim(`  Supported providers: ${PROVIDERS.join(', ')}`));
      console.log('');
    });

  cmd
    .command('clear')
    .description('Remove all saved config')
    .action(() => {
      saveConfig({ provider: null, api_key: null, api_keys: null, model: null, ollama_host: null });
      console.log(chalk.yellow('Config cleared.'));
    });
}
