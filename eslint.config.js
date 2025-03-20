import globals from 'globals';
import eslintJs from '@eslint/js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      globals: globals.node
    }
  },
  eslintJs.configs.recommended,
];
