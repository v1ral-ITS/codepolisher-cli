import chalk from 'chalk';
import {
  compareLines,
  sanitizeTerminalText,
} from './comparison.js';

const SEVERITY_COLOR = {
  critical:    (s) => chalk.bgRed.white.bold(` ${s.toUpperCase()} `),
  security:    (s) => chalk.bgMagenta.white.bold(` ${s.toUpperCase()} `),
  warning:     (s) => chalk.bgYellow.black.bold(` ${s.toUpperCase()} `),
  suggestion:  (s) => chalk.bgBlue.white(` ${s.toUpperCase()} `),
  performance: (s) => chalk.bgCyan.black(` ${s.toUpperCase()} `),
  good:        (s) => chalk.bgGreen.black(` ${s.toUpperCase()} `),
};

function badge(severity) {
  const normalized = typeof severity === 'string' && severity ? severity : 'unknown';
  const fn = SEVERITY_COLOR[normalized] || ((s) => chalk.bgGray.white(` ${s.toUpperCase()} `));
  return fn(normalized);
}

export function printHeader(filename, language) {
  const lang = language ? chalk.cyan(sanitizeTerminalText(language)) : '';
  const file = chalk.bold(sanitizeTerminalText(filename || 'stdin'));
  console.log('');
  console.log(chalk.dim('─'.repeat(60)));
  console.log(`  ${chalk.bold.white('CodePolisher')}  ${file}  ${lang}`);
  console.log(chalk.dim('─'.repeat(60)));
}

export function printSummary(results) {
  const { summary, correction_summary: correctionSummary } = results;
  const comments = Array.isArray(results.comments) ? results.comments : [];

  const counts = {
    critical:    comments.filter(c => c.severity === 'critical').length,
    security:    comments.filter(c => c.severity === 'security').length,
    warning:     comments.filter(c => c.severity === 'warning').length,
    suggestion:  comments.filter(c => c.severity === 'suggestion' || c.severity === 'performance').length,
    good:        comments.filter(c => c.severity === 'good').length,
  };

  console.log('');
  console.log(
    `  ${chalk.red.bold(counts.critical)} critical  ` +
    `${chalk.magenta.bold(counts.security)} security  ` +
    `${chalk.yellow.bold(counts.warning)} warnings  ` +
    `${chalk.blue.bold(counts.suggestion)} suggestions  ` +
    `${chalk.green.bold(counts.good)} good`
  );
  console.log('');

  if (summary) {
    console.log(chalk.dim('  Summary'));
    console.log(`  ${chalk.white(sanitizeTerminalText(summary))}`);
    console.log('');
  }

  if (correctionSummary) {
    console.log(chalk.dim('  Correction approach'));
    console.log(`  ${chalk.white(sanitizeTerminalText(correctionSummary))}`);
    console.log('');
  }
}

export function printComments(comments = []) {
  if (!Array.isArray(comments)) comments = [];
  if (!comments.length) {
    console.log(chalk.green('  No issues found.'));
    return;
  }

  const order = ['critical', 'security', 'warning', 'performance', 'suggestion', 'good'];
  const sorted = [...comments].sort((a, b) => {
    return order.indexOf(a.severity) - order.indexOf(b.severity);
  });

  console.log(chalk.dim('  Issues'));
  console.log('');

  for (const c of sorted) {
    const line = c.line ? chalk.dim(`line ${c.line}`) : chalk.dim('general');
    console.log(`  ${badge(c.severity)}  ${line}`);
    console.log(`  ${chalk.white(sanitizeTerminalText(c.message))}`);
    if (c.impact) {
      console.log(`  ${chalk.dim('why it matters:')} ${chalk.white(sanitizeTerminalText(c.impact))}`);
    }
    if (c.fix) {
      console.log(`  ${chalk.dim('recommended change:')} ${chalk.cyan(sanitizeTerminalText(c.fix))}`);
    }
    console.log('');
  }
}

function truncate(value, width) {
  if (value.length <= width) return value.padEnd(width);
  if (width <= 1) return value.slice(0, width);
  return `${value.slice(0, width - 1)}…`;
}

function comparisonCell(line, marker, width) {
  if (!line) return ' '.repeat(width);
  const prefix = `${String(line.number).padStart(4)} ${marker} `;
  return prefix + truncate(line.text.replace(/\t/g, '  '), Math.max(1, width - prefix.length));
}

export function printComparison(original, corrected, columns = process.stdout.columns || 120) {
  if (!String(corrected ?? '').trim()) {
    console.log(chalk.yellow('  The provider did not return a corrected script.'));
    console.log('');
    return;
  }

  const rows = compareLines(original, corrected);
  const visibleRows = rows.length <= 400
    ? rows
    : [
        ...rows.slice(0, 200),
        { kind: 'separator', before: null, after: null, omitted: rows.length - 400 },
        ...rows.slice(-200),
      ];
  const displayWidth = Math.min(Math.max(columns, 80), 200);
  const cellWidth = Math.max(36, Math.floor((displayWidth - 5) / 2));
  console.log(chalk.dim('  Side-by-side comparison (original vs. AI-suggested correction)'));
  console.log(`  ${chalk.bold(truncate('ORIGINAL', cellWidth))}  |  ${chalk.bold(truncate('CORRECTED', cellWidth))}`);
  console.log(`  ${'-'.repeat(cellWidth)}--+--${'-'.repeat(cellWidth)}`);

  for (const row of visibleRows) {
    if (row.kind === 'separator') {
      const label = row.omitted ? `… ${row.omitted} comparison rows omitted …` : '…';
      console.log(chalk.dim(`  ${truncate(label, cellWidth)}  |  ${truncate(label, cellWidth)}`));
      continue;
    }
    const left = comparisonCell(row.before, row.kind === 'same' ? ' ' : '-', cellWidth);
    const right = comparisonCell(row.after, row.kind === 'same' ? ' ' : '+', cellWidth);
    const color = row.kind === 'same' ? chalk.dim : row.kind === 'changed' ? chalk.yellow : chalk.cyan;
    console.log(`  ${color(left)}  |  ${color(right)}`);
  }
  console.log('');
  console.log(chalk.dim('  Review this suggestion before using it in production.'));
  console.log('');
}

export function printFooter() {
  console.log(chalk.dim('─'.repeat(60)));
  console.log('');
}

export function printError(msg) {
  console.error(`\n${chalk.red.bold('Error:')} ${sanitizeTerminalText(msg)}\n`);
}
