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
  {
    // Lock the Supabase service-role key to a single module so it cannot
    // accidentally proliferate. Any new admin operation must go through
    // `lib/supabase/admin.ts`. See audit PR4.
    files: ['**/*.{ts,tsx,js,mjs}'],
    ignores: [
      'lib/supabase/admin.ts',
      // Allow env-presence checks in the auth bootstrap routes; they do not
      // construct a client with the key.
      'app/api/auth/login/route.ts',
      'app/api/auth/register/route.ts',
      // Impersonation HMAC secret — tracked separately, see audit follow-up.
      'app/api/admin/impersonate/start/route.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env'][property.name='SUPABASE_SERVICE_ROLE_KEY']",
          message:
            'Do not read SUPABASE_SERVICE_ROLE_KEY directly. Use createAdminClient() from lib/supabase/admin.ts.',
        },
      ],
    },
  },
];
