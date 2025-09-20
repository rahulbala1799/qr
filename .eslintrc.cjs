module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  rules: {
    // Customize rules as needed
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true 
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-var-requires': 'off' // Allow require() in JS files
  },
  overrides: [
    {
      // Allow CommonJS in script files
      files: ['scripts/**/*.js', '*.config.js', '*.config.cjs'],
      env: {
        node: true
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    },
    {
      // Allow type definitions without usage
      files: ['src/types/**/*.d.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off'
      }
    }
  ],
  env: {
    browser: true,
    node: true,
    es6: true
  }
};
