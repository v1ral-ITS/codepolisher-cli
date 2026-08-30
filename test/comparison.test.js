import test from 'node:test';
import assert from 'node:assert/strict';
import {
  changedHunks,
  compareLines,
  hasMeaningfulChanges,
  normalizeCorrectedCode,
  sanitizeTerminalText,
} from '../src/comparison.js';

test('normalizeCorrectedCode removes a surrounding Markdown fence', () => {
  assert.equal(normalizeCorrectedCode('```js\nconst fixed = true;\n```'), 'const fixed = true;');
});

test('normalizeCorrectedCode leaves unfenced code untouched', () => {
  assert.equal(normalizeCorrectedCode('const fixed = true;'), 'const fixed = true;');
});

test('hasMeaningfulChanges ignores Windows versus Unix line endings', () => {
  assert.equal(hasMeaningfulChanges('one\r\ntwo', 'one\ntwo'), false);
  assert.equal(hasMeaningfulChanges('one', 'two'), true);
  assert.equal(hasMeaningfulChanges('one', ''), false);
});

test('compareLines aligns inserted lines without shifting the remaining file', () => {
  const rows = compareLines('one\ntwo\nthree', 'one\ninserted\ntwo\nthree');
  assert.deepEqual(rows.map(row => row.kind), ['same', 'added', 'same', 'same']);
  assert.equal(rows[1].after.text, 'inserted');
});

test('changedHunks keeps requested context around changes', () => {
  const rows = compareLines('one\ntwo\nthree\nfour\nfive', 'one\ntwo\nchanged\nfour\nfive');
  assert.deepEqual(changedHunks(rows, 1).map(row => row.kind), ['same', 'changed', 'same']);
});

test('sanitizeTerminalText removes terminal control sequences', () => {
  assert.equal(sanitizeTerminalText('\u001B[31mred\u001B[0m\u0000'), 'red');
});
