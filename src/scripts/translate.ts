import { Argv } from 'yargs';
import { RootCommand } from '..';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { Translate } from '@google-cloud/translate/build/src/v2';

const INDENT = 32;

// List of language codes available for google translate and required for the app.
// Saving them separately as api requests are expensive and we can customise which languages to support.
const CODES: {
  readonly [key: string]: string;
} = {
  Afrikaans: 'af',
  Albanian: 'sq',
  Amharic: 'am',
  Arabic: 'ar',
  Armenian: 'hy',
  Azerbaijani: 'az',
  Basque: 'eu',
  Belarusian: 'be',
  Bengali: 'bn',
  Bosnian: 'bs',
  Bulgarian: 'bg',
  Catalan: 'ca',
  Cebuano: 'ceb',
  Chinese: 'zh',
  ChineseSimplified: 'zh-CN ',
  ChineseTraditional: 'zh-TW',
  Corsican: 'co',
  Croatian: 'hr',
  Czech: 'cs',
  Danish: 'da',
  Dutch: 'nl',
  English: 'en',
  Esperanto: 'eo',
  Estonian: 'et',
  Finnish: 'fi',
  French: 'fr',
  Frisian: 'fy',
  Galician: 'gl',
  Georgian: 'ka',
  German: 'de',
  Greek: 'el',
  Gujarati: 'gu',
  Haitian: 'ht',
  Creole: 'ht',
  Hausa: 'ha',
  Hawaiian: 'haw',
  Hebrew: 'he',
  HebrewOld: 'iw',
  Hindi: 'hi',
  Hmong: 'hmn',
  Hungarian: 'hu',
  Icelandic: 'is',
  Igbo: 'ig',
  Indonesian: 'id',
  Irish: 'ga',
  Italian: 'it',
  Japanese: 'ja',
  Javanese: 'jv',
  Kannada: 'kn',
  Kazakh: 'kk',
  Khmer: 'km',
  Kinyarwanda: 'rw',
  Korean: 'ko',
  Kurdish: 'ku',
  Kyrgyz: 'ky',
  Lao: 'lo',
  Latvian: 'lv',
  Lithuanian: 'lt',
  Luxembourgish: 'lb',
  Macedonian: 'mk',
  Malagasy: 'mg',
  Malay: 'ms',
  Malayalam: 'ml',
  Maltese: 'mt',
  Maori: 'mi',
  Marathi: 'mr',
  Mongolian: 'mn',
  Myanmar: 'my',
  Burmese: 'my',
  Nepali: 'ne',
  Norwegian: 'no',
  Nyanja: 'ny',
  Chichewa: 'ny',
  Odia: 'or',
  Oriya: 'or',
  Pashto: 'ps',
  Persian: 'fa',
  Polish: 'pl',
  Portuguese: 'pt',
  Punjabi: 'pa',
  Romanian: 'ro',
  Russian: 'ru',
  Samoan: 'sm',
  Scots: 'gd',
  Gaelic: 'gd',
  Serbian: 'sr',
  Sesotho: 'st',
  Shona: 'sn',
  Sindhi: 'sd',
  Sinhala: 'si',
  Sinhalese: 'si',
  Slovak: 'sk',
  Slovenian: 'sl',
  Somali: 'so',
  Spanish: 'es',
  Sundanese: 'su',
  Swahili: 'sw',
  Swedish: 'sv',
  Tagalog: 'tl',
  Filipino: 'tl',
  Tajik: 'tg',
  Tamil: 'ta',
  Tatar: 'tt',
  Telugu: 'te',
  Thai: 'th',
  Turkish: 'tr',
  Turkmen: 'tk',
  Ukrainian: 'uk',
  Urdu: 'ur',
  Uyghur: 'ug',
  Uzbek: 'uz',
  Vietnamese: 'vi',
  Welsh: 'cy',
  Xhosa: 'xh',
  Yiddish: 'yi',
  Yoruba: 'yo',
  Zulu: 'zu',
};

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
  supplied: readonly string[]
): Promise<string> => {
  // eslint-disable-next-line functional/no-conditional-statement
  if (supplied[0] === undefined || supplied[1] === undefined) {
    // eslint-disable-next-line functional/no-throw-statement
    throw new Error(
      `Cannot find token and text to translate in matched line segments ${supplied.join(
        ','
      )}`
    );
  }

  const token: string = supplied[0];
  const textToTranslate: string = supplied[1];
  const extra: string = supplied[2] !== undefined ? supplied[2] : '';

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

const fileLines = (path: string): readonly string[] =>
  readFileSync(path).toString().split('\n');

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
    // eslint-disable-next-line functional/no-conditional-statement
    if (lineWithTokenExceptSpace.length <= 1) return line;

    const preExistingToken =
      preExistingTokens !== undefined
        ? preExistingTokens.find(
            (elem) => elem.token === lineWithTokenExceptSpace[0]
          )
        : undefined;

    return preExistingToken !== undefined
      ? preExistingToken.line
      : await googleTranslation(lineWithTokenExceptSpace);
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
        args.outputFilePath !== undefined
          ? allOutputFileTokens(fileLines(outputFilePath))
          : undefined
      );

      // eslint-disable-next-line functional/no-expression-statement
      writeFileSync(outputFilePath, translated.join('\n'));
    }
  );
