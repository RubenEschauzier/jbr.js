# ESLint Config

[![Build status](https://github.com/rubensworks/eslint-config/workflows/CI/badge.svg)](https://github.com/rubensworks/eslint-config/actions?query=workflow%3ACI)
[![npm version](https://badge.fury.io/js/%40rubensworks%2Feslint-config.svg)](https://www.npmjs.com/package/@rubensworks/eslint-config)

This is a repository for my personal [ESLint](https://eslint.org/) configurations.

## Install

```bash
$ yarn add -D @rubensworks/eslint-config eslint
```

or

```bash
$ npm install -D @rubensworks/eslint-config eslint
```

## ESLint config

`.eslintrc.js`:
```javascript
require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        tsconfigRootDir: __dirname, // this is the reason this is a .js file
        project: ['./tsconfig.eslint.json'],
    },
    extends: [
        '@rubensworks'
    ],
    rules: {
        'no-implicit-coercion': 'off'
    }
};
```

`.eslintignore`:
```text
node_modules
coverage

**/*.js
**/*.d.ts
**/*.js.map
```

`tsconfig.eslint.json`: _(Needed to force the TS compiler to also consider test files)_
```json
{
  "extends": "./tsconfig.json",
  "include": [
    "index.ts",
    "lib/**/*.ts",
    "test/**/*.ts",
    "bin/**/*.ts"
  ],
  "exclude": [
    "**/node_modules"
  ]
}
```

## Recommended package additions

`.gitignore`:
```
.eslintcache
```

`package.json`:
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts --cache"
  }
}
```

## License

This software is written by [Ruben Taelman](http://rubensworks.net/).

This code is released under the [MIT license](http://opensource.org/licenses/MIT).
