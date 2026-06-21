/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// Every export of auth/tokenManager.ts except the four documented OAuth CSRF
// helpers (see src/pages/AGENTS.md "Accepted exception"). Update this list if
// tokenManager.ts's export surface changes.
const TOKEN_MANAGER_DATA_ACCESS_EXPORTS = [
  'setOnAuthFailure',
  'saveTokens',
  'getAccessToken',
  'saveAsgardeoToken',
  'getAsgardeoToken',
  'clearAsgardeoToken',
  'getRefreshToken',
  'clearTokens',
  'getOrRefreshAsgardeoToken',
  'saveOidcAuthMetadata',
  'clearOidcAuthMetadata',
  'refreshAccessToken',
  'authenticatedFetch',
  'switchOrgToken',
  'revokeToken',
  'saveRedirectUrl',
  'generateAndSaveOIDCState',
  'generatePKCE',
  'saveCodeVerifier',
  'getAndClearCodeVerifier',
  'getOrgUuidFromToken',
];

// `group` patterns are matched gitignore-style: a leading `#` starts a comment
// unless escaped, so the alias must be written as `\#api`, not `#api`.
const NO_DIRECT_API_PATTERN = {
  group: ['\\#api', '\\#api/*'],
  message: 'UI code must not import api/ directly — call a hook from src/hooks/ instead. See AGENTS.md (the four-layer architecture).',
};

export default [
  { ignores: ['dist', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
  // Everywhere: go through the #api alias, never a literal product folder
  // (src/api/_check.ts is exempt — it intentionally imports every product's
  // real files to assert them against contracts.ts at compile time).
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/api/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['**/api/wip/*', '**/api/cloud/*', '**/api/icp/*'], message: "Import product API functions via the '#api/<domain>' alias, never a literal product folder — see AGENTS.md." }],
        },
      ],
    },
  },
  // UI layer (pages/components/layouts/contexts): no direct api/ access and no
  // direct auth/tokenManager data access — all server state and token data
  // must flow through src/hooks/. See AGENTS.md, src/pages/AGENTS.md,
  // src/components/AGENTS.md.
  {
    files: ['src/pages/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/layouts/**/*.{ts,tsx}', 'src/contexts/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            NO_DIRECT_API_PATTERN,
            { group: ['**/auth/tokenManager'], message: 'auth/tokenManager is raw token/data access — use a hook (useAuth, useOrgUuid, ...) instead. Only the documented OAuth CSRF helpers may bypass this (src/pages/AGENTS.md) — add a file-scoped override below if you add one.' },
          ],
        },
      ],
    },
  },
  // Narrow, named exception: the three pages documented in src/pages/AGENTS.md
  // that import the OAuth CSRF state helpers (pure localStorage utilities, no
  // network call) directly. Still blocked from every other tokenManager export.
  {
    files: ['src/pages/OIDCCallback.tsx', 'src/pages/Project.tsx', 'src/pages/CreateIntegrationOptions.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [NO_DIRECT_API_PATTERN],
          paths: [
            {
              name: '../auth/tokenManager',
              importNames: TOKEN_MANAGER_DATA_ACCESS_EXPORTS,
              message: 'Only the OAuth CSRF helpers (generateAndSaveGitHubState, validateAndClearGitHubState, validateAndClearOIDCState, getAndClearRedirectUrl) may be imported directly here — everything else must go through a hook. See src/pages/AGENTS.md.',
            },
          ],
        },
      ],
    },
  },
];
