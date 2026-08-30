import { constants } from 'fs';
import { access, writeFile } from 'fs/promises';
import { createInterface } from 'readline/promises';
import { dirname, parse, resolve } from 'path';

export function suggestedOutputPath(sourcePath) {
  const absoluteSource = resolve(sourcePath);
  const { dir, name, ext } = parse(absoluteSource);
  return resolve(dir, `${name}.polished${ext}`);
}

async function pathExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

export async function saveCorrectedCode(correctedCode, destinationPath, sourcePath = null) {
  const destination = resolve(destinationPath);
  if (sourcePath && destination === resolve(sourcePath)) {
    throw new Error('Choose a different filename; the original file will not be overwritten.');
  }

  if (await pathExists(destination)) {
    throw new Error(`File already exists: ${destination}`);
  }

  await writeFile(destination, correctedCode, { encoding: 'utf8', flag: 'wx' });
  return destination;
}

export async function promptToSaveCorrection({ correctedCode, sourcePath, input = process.stdin, output = process.stdout }) {
  if (!sourcePath || !input.isTTY || !output.isTTY) return null;

  const prompt = createInterface({ input, output });
  try {
    const wantsSave = (await prompt.question('Would you like to save the suggested fix as a new file? (y/N) '))
      .trim()
      .toLowerCase();
    if (wantsSave !== 'y' && wantsSave !== 'yes') return null;

    const defaultPath = suggestedOutputPath(sourcePath);
    while (true) {
      const answer = (await prompt.question(`Save as [${defaultPath}]: `)).trim();
      const destination = answer || defaultPath;
      try {
        return await saveCorrectedCode(correctedCode, destination, sourcePath);
      } catch (error) {
        output.write(`${error.message}\n`);
      }
    }
  } finally {
    prompt.close();
  }
}

export function resolveSaveDestination(value, sourcePath = null) {
  if (!value) return null;
  if (sourcePath && dirname(value) === '.') {
    return resolve(dirname(resolve(sourcePath)), value);
  }
  return resolve(value);
}
