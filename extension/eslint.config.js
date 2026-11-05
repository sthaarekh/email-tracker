import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        chrome: "readonly",
        EmailTrackerGmail: "readonly",
        EmailTrackerCompose: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
        },
      ],
      eqeqeq: "error",
      curly: "error",
    },
  },
];
