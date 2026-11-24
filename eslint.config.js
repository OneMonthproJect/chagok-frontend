import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// 경계 규칙은 chagok-docs/CONVENTIONS.md 7장이 원본이다. 바꾸려면 거기부터.
const FEATURE_PATTERNS = [
  { group: ['@/pages/*'], message: 'features는 pages를 import하지 않습니다' },
  { group: ['@/features/*'], message: '다른 feature가 필요하면 pages에서 조합하세요 (같은 feature 안은 상대 경로)' },
]
const MOCKS_PATTERN = { group: ['**/mocks/**', '**/mocks'], message: 'Mock은 api.ts에서만 고릅니다 (CONVENTIONS 7장 Mock)' }

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/shared/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [
      { group: ['@/features/*', '@/pages/*'], message: 'shared는 features·pages를 import하지 않습니다' },
    ] }] },
  },
  {
    files: ['src/features/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [...FEATURE_PATTERNS] }] },
  },
  // Mock은 api.ts에서만 고른다 (CONVENTIONS 7장 「Mock」). 화면 쪽의 정적 import를 막는다(동적 import()는 막지 않음).
  // flat config는 같은 규칙을 나중 설정이 덮어쓰므로 components에는 feature 경계 패턴을 함께 둔다.
  {
    files: ['src/pages/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [MOCKS_PATTERN] }] },
  },
  {
    files: ['src/features/*/components/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [...FEATURE_PATTERNS, MOCKS_PATTERN] }] },
  },
  {
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
)
