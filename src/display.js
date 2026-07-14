import chalk from 'chalk';

const SEVERITY_COLOR = {
  critical:    (s) => chalk.bgRed.white.bold(` ${s.toUpperCase()} `),
  security:    (s) => chalk.bgMagenta.white.bold(` ${s.toUpperCase()} `),
  warning:     (s) => chalk.bgYellow.black.bold(` ${s.toUpperCase()} `),
  suggestion:  (s) => chalk.bgBlue.white(` ${s.toUpperCase()} `),
  performance: (s) => chalk.bgCyan.black(` ${s.toUpperCase()} `),
  good:        (s) => chalk.bgGreen.black(` ${s.toUpperCase()} `),
};

function badge(severity) {
  const fn = SEVERITY_COLOR[severity] || ((s) => chalk.bgGray.white(` ${s.toUpperCase()} `));
  return fn(severity);
}

export function printHeader(filename, language) {
  const lang = language ? chalk.cyan(language) : '';
  const file = chalk.bold(filename || 'stdin');
  console.log('');
  console.log(chalk.dim('─'.repeat(60)));
  console.log(`  ${chalk.bold.white('CodePolisher')}  ${file}  ${lang}`);
  console.log(chalk.dim('─'.repeat(60)));
}

export function printSummary(results) {
  const { comments = [], summary } = results;

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
    console.log(`  ${chalk.white(summary)}`);
    console.log('');
  }
}

export function printComments(comments = []) {
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
    console.log(`  ${chalk.white(c.message)}`);
    if (c.fix) {
      console.log(`  ${chalk.dim('fix:')} ${chalk.cyan(c.fix)}`);
    }
    console.log('');
  }
}

export function printFooter() {
  console.log(chalk.dim('─'.repeat(60)));
  console.log('');
}

export function printError(msg) {
  console.error(`\n${chalk.red.bold('Error:')} ${msg}\n`);
}
