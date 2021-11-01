import { Argv } from 'yargs';
import { RootCommand } from '..';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { Translate } from '@google-cloud/translate/build/src/v2';
import { INDENT, CODES } from './translate.defaults';

/**
 * Creates those directories of a path that doesn't exist.
 *
 * @param path The directory path to create if it doesn't exist.
 * @returns nothing, just creates the path or does nothing if it already exists.
 */
// eslint-disable-next-line functional/no-return-void
const ensureDirectory = (path: string): void => {
  const folder: string = dirname(path);
  // eslint-disable-next-line functional/no-conditional-statement
  if (existsSync(folder)) return;
  // eslint-disable-next-line functional/no-expression-statement
  ensureDirectory(folder);
  // eslint-disable-next-line functional/no-expression-statement
  mkdirSync(folder);
};

const googleTranslation = async (
  supplied: readonly [string, string, readonly string[]]
): Promise<string> => {
  const token: string = supplied[0];
  const textToTranslate: string = supplied[1];
  const extra: string = supplied[2].length > 0 ? supplied[2].join(' ') : '';

  const translator = new Translate();
  // First array element from google translation's response will be the translated text.
  const translation: string = (
    await translator.translate(textToTranslate, 'bn')
  )[0];

  // Formula to work out padding after token.
  const pad =
    token.length > INDENT
      ? ''
      : new Array(INDENT - (token.length % INDENT)).fill(' ').join('');

  return `"${token}"${pad} = "${translation}"; //AUTO "${textToTranslate}"${extra}`;
};

const fileLines = (path: string): readonly string[] => {
  // eslint-disable-next-line functional/no-try-statement
  try {
    return readFileSync(path).toString().split('\n');
  } catch (ENOENT: unknown) {
    return [];
  }
};

const allOutputFileTokens = (
  lines: readonly string[]
): readonly { readonly token: string; readonly line: string }[] =>
  lines
    .map((line) => {
      const lineWithTokenExceptSpace: readonly string[] = line
        .split(/"([^"]+)"\s*=\s*"([^"]+)"(.*$)/u)
        .filter((elem) => /\S/u.test(elem));

      return lineWithTokenExceptSpace.length > 1 &&
        lineWithTokenExceptSpace[0] !== undefined
        ? { token: lineWithTokenExceptSpace[0], line }
        : { token: '', line: '' };
    })
    .filter((elem) => elem.token !== '');

const allLineTranslation = (
  dataLines: readonly string[],
  preExistingTokens?: readonly {
    readonly token: string;
    readonly line: string;
  }[]
): Promise<readonly string[]> => {
  const promises: readonly Promise<string>[] = dataLines.map(async (line) => {
    const lineWithTokenExceptSpace: readonly string[] = line
      .split(/"([^"]+)"\s*=\s*"([^"]+)"(.*$)/u)
      .filter((elem) => /\S/u.test(elem));

    // If the first and second member of the array is not defined it means that we did not find desired pattern "token"="value"
    // eslint-disable-next-line functional/no-conditional-statement
    if (
      lineWithTokenExceptSpace[0] !== undefined &&
      lineWithTokenExceptSpace[1] !== undefined
    ) {
      const preExistingToken = preExistingTokens?.find(
        (elem) => elem.token === lineWithTokenExceptSpace[0]
      );

      return preExistingToken !== undefined
        ? preExistingToken.line
        : await googleTranslation([
            lineWithTokenExceptSpace[0],
            lineWithTokenExceptSpace[1],
            lineWithTokenExceptSpace.slice(2),
          ]);
    }
    return line;
  });
  return Promise.all(promises);
};

export default ({ command }: RootCommand): Argv<unknown> =>
  command(
    'translateFile',
    'Translate a file into another language',
    (yargs) =>
      yargs
        .option('inputFilePath', { type: 'string', demandOption: true })
        .option('outputFilePath', { type: 'string', demandOption: false })
        .option('language', {
          type: 'string',
          demandOption: true,
          // eslint-disable-next-line total-functions/no-unsafe-readonly-mutable-assignment
          choices: Object.keys(CODES),
        }),
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async (args) => {
      const inputFileLines: readonly string[] = fileLines(args.inputFilePath);

      const outputFilePath =
        args.outputFilePath ??
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `${CODES[args.language]}.lproj/Localizable.strings`;

      // eslint-disable-next-line functional/no-expression-statement
      ensureDirectory(outputFilePath);

      const translated: readonly string[] = await allLineTranslation(
        inputFileLines,
        allOutputFileTokens(fileLines(outputFilePath))
      );

      // eslint-disable-next-line functional/no-expression-statement
      writeFileSync(outputFilePath, translated.join('\n'));
    }
  );
