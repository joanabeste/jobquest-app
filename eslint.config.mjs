import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const nextConfig = require('eslint-config-next');

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...nextConfig,
  {
    rules: {
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Experimental React Compiler rules — too strict for existing codebase patterns
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
    },
  },
];
