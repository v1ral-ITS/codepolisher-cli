import { readFileSync } from 'fs';
import { basename } from 'path';
import ora from 'ora';
import { requireConfig } from '../config.js';
import { invokeLLM } from '../api.js';
import { buildReviewPrompt, buildSecurityPrompt } from '../prompt.js';
import { printHeader, printSummary, printComments, printFooter, printError } from '../display.js';

export async function reviewCommand(filePath, options) {
  const config = requireConfig();

  // Read code
  let code, filename;
  if (filePath) {
    try {
      code = readFileSync(filePath, 'utf8');
      filename = basename(filePath);
    } catch {
      printError(`Could not read file: ${filePath}`);
      process.exit(1);
    }
  } else {
    // Read from stdin
    code = readFileSync(0, 'utf8');
    filename = null;
  }

  if (!code.trim()) {
    printError('No code to review.');
    process.exit(1);
  }

  // Build settings from flags
  const settings = {
    focusAreas: options.focus ? options.focus.split(',').map(s => s.trim()) : [],
    customRules: options.rules || '',
    strictMode: !!options.strict,
  };

  const prompt = options.security
    ? buildSecurityPrompt(code, options.language || 'auto', filename)
    : buildReviewPrompt(code, options.language || 'auto', filename, settings);

  const codeLines = code.split('\n').length;

  const spinner = ora(`Reviewing with ${config.provider}…`).start();

  let results;
  try {
    results = await invokeLLM(config, {
      prompt,
      codeLines,
    });
    spinner.stop();
  } catch (err) {
    spinner.stop();
    printError(`Review failed: ${err.message || err}`);
    process.exit(1);
  }

  // JSON output mode
  if (options.output === 'json') {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  printHeader(filename, results.detected_language);
  printSummary(results);
  printComments(results.comments);
  printFooter();

  // Exit with non-zero if critical issues found
  const hasCritical = results.comments?.some(c => c.severity === 'critical' || c.severity === 'security');
  if (hasCritical && options.failOnCritical) {
    process.exit(1);
  }
}
