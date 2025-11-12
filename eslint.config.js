import config from "@bonniernews/eslint-config";
import progress from "eslint-plugin-file-progress";
import json from "eslint-plugin-json";

export default [
  ...config,
  { settings: { "import/resolver": { node: true, exports: true } } },
  { files: [ "**/*.json" ], ...json.configs.recommended },
  { ignores: [ "scripts/**", "**/.turbo/**", "**/build/**", "**/coverage/**" ] },
  { files: [ "apps/*/scripts/**" ], rules: { "no-console": "off", "n/no-process-exit": "off" } },
  progress.configs.recommended,
];
