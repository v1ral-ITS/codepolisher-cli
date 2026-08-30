const MAX_LCS_CELLS = 2_000_000;
const ANSI_SEQUENCE = /\u001B(?:\][^\u0007]*(?:\u0007|\u001B\\)|\[[0-?]*[ -/]*[@-~]|[@-_])/g;

export function sanitizeTerminalText(value) {
  return String(value ?? '')
    .replace(ANSI_SEQUENCE, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export function normalizeCorrectedCode(value) {
  const code = String(value ?? '');
  const fenced = code.match(/^\s*```[^\n]*\n([\s\S]*?)\n```\s*$/);
  return fenced ? fenced[1] : code;
}

export function hasMeaningfulChanges(original, corrected) {
  if (!String(corrected ?? '').trim()) return false;
  const normalize = (value) => String(value ?? '').replace(/\r\n/g, '\n');
  return normalize(original) !== normalize(corrected);
}

function splitLines(value) {
  return sanitizeTerminalText(value).replace(/\r\n/g, '\n').split('\n');
}

function fallbackRows(left, right) {
  const rows = [];
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const before = index < left.length ? left[index] : null;
    const after = index < right.length ? right[index] : null;
    rows.push({
      kind: before === after ? 'same' : before === null ? 'added' : after === null ? 'removed' : 'changed',
      before: before === null ? null : { number: index + 1, text: before },
      after: after === null ? null : { number: index + 1, text: after },
    });
  }
  return rows;
}

export function compareLines(original, corrected) {
  const left = splitLines(original);
  const right = splitLines(corrected);
  if (left.length * right.length > MAX_LCS_CELLS) return fallbackRows(left, right);

  const width = right.length + 1;
  const table = new Uint32Array((left.length + 1) * width);
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[(i * width) + j] = left[i] === right[j]
        ? table[((i + 1) * width) + j + 1] + 1
        : Math.max(table[((i + 1) * width) + j], table[(i * width) + j + 1]);
    }
  }

  const operations = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      operations.push({ kind: 'same', number: i + 1, otherNumber: j + 1, text: left[i] });
      i += 1;
      j += 1;
    } else if (table[((i + 1) * width) + j] >= table[(i * width) + j + 1]) {
      operations.push({ kind: 'removed', number: i + 1, text: left[i] });
      i += 1;
    } else {
      operations.push({ kind: 'added', number: j + 1, text: right[j] });
      j += 1;
    }
  }
  while (i < left.length) operations.push({ kind: 'removed', number: ++i, text: left[i - 1] });
  while (j < right.length) operations.push({ kind: 'added', number: ++j, text: right[j - 1] });

  const rows = [];
  for (let cursor = 0; cursor < operations.length;) {
    const operation = operations[cursor];
    if (operation.kind === 'same') {
      rows.push({
        kind: 'same',
        before: { number: operation.number, text: operation.text },
        after: { number: operation.otherNumber, text: operation.text },
      });
      cursor += 1;
      continue;
    }

    const removed = [];
    const added = [];
    while (cursor < operations.length && operations[cursor].kind !== 'same') {
      const change = operations[cursor];
      (change.kind === 'removed' ? removed : added).push(change);
      cursor += 1;
    }
    const changeLength = Math.max(removed.length, added.length);
    for (let changeIndex = 0; changeIndex < changeLength; changeIndex += 1) {
      const before = removed[changeIndex] || null;
      const after = added[changeIndex] || null;
      rows.push({
        kind: before && after ? 'changed' : before ? 'removed' : 'added',
        before: before ? { number: before.number, text: before.text } : null,
        after: after ? { number: after.number, text: after.text } : null,
      });
    }
  }
  return rows;
}

export function changedHunks(rows, context = 2) {
  const selected = new Set();
  rows.forEach((row, index) => {
    if (row.kind === 'same') return;
    for (let nearby = Math.max(0, index - context); nearby <= Math.min(rows.length - 1, index + context); nearby += 1) {
      selected.add(nearby);
    }
  });

  const output = [];
  let previous = -2;
  for (const index of [...selected].sort((a, b) => a - b)) {
    if (output.length > 0 && index > previous + 1) {
      output.push({ kind: 'separator', before: null, after: null });
    }
    output.push(rows[index]);
    previous = index;
  }
  return output;
}
