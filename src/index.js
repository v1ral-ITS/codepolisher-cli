import { Command } from 'commander';
import { reviewCommand } from './commands/review.js';
import { configCommand } from './commands/config-cmd.js';

const program = new Command();

program
  .name('codepolisher')
  .description('AI-powered code review in your terminal — by ImPerial TeK. Solutions')
  .version('1.1.0');

// review command
program
  .command('review [file]')
  .description('Review a file (or pipe code via stdin)')
  .option('-l, --language <lang>', 'Language hint (default: auto-detect)')
  .option('-f, --focus <areas>', 'Comma-separated focus areas: security,performance,readability,error_handling,best_practices,testing')
  .option('-r, --rules <text>', 'Custom review rules')
  .option('--strict', 'Strict mode — flag every issue')
  .option('--security', 'Run a full security audit')
  .option('--output <format>', 'Output format: pretty (default) or json')
  .option('--fail-on-critical', 'Exit code 1 if critical/security issues found')
  .action(reviewCommand);

// config command
configCommand(program);

program.parse(process.argv);
