# Auto Token Translator

This project translates a file containing tokens into desired language.

### ESLint

A syntax and logic linter for JavaScript/TypeScript. ESlint-recommended with
some overrides is the currently configured rules.

- no-console: `console.log` has been banned for log observability.
- unused-imports: This is enabled to clear out imports that aren't needed.

### Nvmrc

Nvmrc can set your runtime environment to the correct Node version for this
project. Run command `nvm use`.

### Prettier

Code formatter for any support filed. We use defaults for prettier except for
requiring a single quote.

### Rollup

Code packager and compiler. Rollup builds the TypeScript CLI tool into an
executable JavaScript CLI tool. The executable file is a node environment.

## Building the Tool

To use the token translator, you will:

1. Use the current nvm version `nvm use`
2. Install node modules `npm install`
3. Obtain a service account key and set it to an environment variable `export GOOGLE_APPLICATION_CREDENTIALS="serviceAccountPrivateKey.json"`
   More information on how to get a service account private key https://cloud.google.com/iam/docs/creating-managing-service-account-keys
4. Build the tool `npm run build`
5. Run the executable with parameters `./dist/auto-token-translator translateFile --inputFilePath en.lproj/Localizable.strings --language Bengali`
6. You can also specify an existing output file with `--outputFilePath filePath`

## Included packages

- **clear**: Clear screen on terminal (https://www.npmjs.com/package/clear)
- **clui**: Create gauges, sparklines, progress lines and spinners
  (https://www.npmjs.com/package/clui)
- **color**: Colored text on cli output (https://www.npmjs.com/package/color)
  <br/>To use colours you will need to import them using a ES6 and ES5 import.
  There is some weirdless that can't be explain with types.
  ```typescript
  // @ts-ignore - Type Defs from Import
  // eslint-disable-next-line unused-imports/no-unused-imports-ts
  import colors from 'colors';
  require('colors');
  ```
- **inquirer**: Create interactive prompts
  (https://www.npmjs.com/package/inquirer)
- **yargs**: Command line parser (https://www.npmjs.com/package/yargs)
- **@google-cloud/translate**: Use google cloud's translate api (https://www.npmjs.com/package/@google-cloud/translate)

## Commands

- **start**: Builds the command in a development mode
- **build**: Builds a production version of the command
- **watch**: Build the command in development mode and watch the source
  directory for changes. If changes detected, will rebuild in development mode