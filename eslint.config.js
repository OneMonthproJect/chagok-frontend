import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// 경계 규칙은 chagok-docs/CONVENTIONS.md 7장이 원본이다. 바꾸려면 거기부터.
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
    rules: { 'no-restricted-imports': ['error', { patterns: [
      { group: ['@/pages/*'], message: 'features는 pages를 import하지 않습니다' },
      { group: ['@/features/*'], message: '다른 feature가 필요하면 pages에서 조합하세요 (같은 feature 안은 상대 경로)' },
    ] }] },
  },
  {
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
)
