import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default tseslint.config(
  js.configs.recommended,
  // obsidianmd: sets up TypeScript parser and all plugin rules (handles own file patterns)
  ...obsidianmd.configs.recommended,
  // src: enable type-aware linting and apply rule overrides
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // Desktop-only plugin (isDesktopOnly: true) — popout window compat not required
      'obsidianmd/prefer-active-doc': 'off',
      'obsidianmd/prefer-active-window-timers': 'off',
      'obsidianmd/prefer-instanceof': 'off',
      'obsidianmd/ui/sentence-case': [
        'warn',
        {
          brands: ['Toggl', 'Obsidian', 'Sync'],
          acronyms: ['API', 'OK'],
        },
      ],
    },
  },
  // tests: no tsconfig → disable all type-aware rules
  {
    files: ['tests/**/*.ts'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'obsidianmd/prefer-active-doc': 'off',
      'obsidianmd/prefer-active-window-timers': 'off',
      'obsidianmd/no-plugin-as-component': 'off',
      'obsidianmd/no-unsupported-api': 'off',
      'obsidianmd/no-view-references-in-plugin': 'off',
      'obsidianmd/prefer-file-manager-trash-file': 'off',
      'obsidianmd/prefer-instanceof': 'off',
    },
  },
);
