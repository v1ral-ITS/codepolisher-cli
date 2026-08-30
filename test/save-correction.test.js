import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { PassThrough } from 'stream';
import {
  promptToSaveCorrection,
  resolveSaveDestination,
  saveCorrectedCode,
  suggestedOutputPath,
} from '../src/save-correction.js';

async function withTempDirectory(run) {
  const directory = await mkdtemp(join(tmpdir(), 'codepolisher-save-'));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('suggestedOutputPath adds .polished before the extension', () => {
  const source = resolve('project', 'app.test.js');
  assert.equal(suggestedOutputPath(source), resolve('project', 'app.test.polished.js'));
});

test('saveCorrectedCode writes only the corrected script to a new file', async () => {
  await withTempDirectory(async directory => {
    const source = join(directory, 'app.js');
    const destination = join(directory, 'app.polished.js');
    await writeFile(source, 'const oldValue = true;', 'utf8');

    const savedPath = await saveCorrectedCode('const newValue = true;', destination, source);

    assert.equal(savedPath, destination);
    assert.equal(await readFile(destination, 'utf8'), 'const newValue = true;');
    assert.equal(await readFile(source, 'utf8'), 'const oldValue = true;');
  });
});

test('saveCorrectedCode refuses to overwrite the original file', async () => {
  await withTempDirectory(async directory => {
    const source = join(directory, 'app.js');
    await writeFile(source, 'original', 'utf8');

    await assert.rejects(
      saveCorrectedCode('corrected', source, source),
      /original file will not be overwritten/,
    );
    assert.equal(await readFile(source, 'utf8'), 'original');
  });
});

test('saveCorrectedCode refuses to overwrite any existing destination', async () => {
  await withTempDirectory(async directory => {
    const source = join(directory, 'app.js');
    const destination = join(directory, 'existing.js');
    await writeFile(source, 'original', 'utf8');
    await writeFile(destination, 'keep me', 'utf8');

    await assert.rejects(
      saveCorrectedCode('corrected', destination, source),
      /File already exists/,
    );
    assert.equal(await readFile(destination, 'utf8'), 'keep me');
  });
});

test('a filename-only --save-as value is placed beside the reviewed file', () => {
  const source = resolve('project', 'src', 'app.js');
  assert.equal(
    resolveSaveDestination('fixed.js', source),
    resolve('project', 'src', 'fixed.js'),
  );
});

test('interactive save accepts the safe default filename', async () => {
  await withTempDirectory(async directory => {
    const source = join(directory, 'app.js');
    const input = new PassThrough();
    const output = new PassThrough();
    input.isTTY = true;
    output.isTTY = true;
    await writeFile(source, 'original', 'utf8');

    const savePromise = promptToSaveCorrection({
      correctedCode: 'corrected',
      sourcePath: source,
      input,
      output,
    });
    input.write('yes\n');
    await new Promise(resolveImmediate => setImmediate(resolveImmediate));
    input.write('\n');

    const savedPath = await savePromise;
    input.end();
    output.end();

    assert.equal(savedPath, join(directory, 'app.polished.js'));
    assert.equal(await readFile(savedPath, 'utf8'), 'corrected');
  });
});
