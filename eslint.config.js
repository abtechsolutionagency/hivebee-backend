import globals from 'globals';

export default [
  {
    files: ['**/*.js'],
    ignores: ['node_modules/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];
