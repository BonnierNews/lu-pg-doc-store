"use strict";

const config = require("@bonniernews/eslint-config");
const progress = require("eslint-plugin-file-progress");
const json = require("eslint-plugin-json");

module.exports = [
  ...config,
  { settings: { "import/resolver": { node: true, exports: true } } },
  { files: [ "**/*.json" ], ...json.configs.recommended },
  { ignores: [ "scripts/**", "**/.turbo/**", "**/build/**", "**/coverage/**" ] },
  { files: [ "apps/*/scripts/**" ], rules: { "no-console": "off", "n/no-process-exit": "off" } },
  progress.default.configs.recommended,
];
