import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import { globalIgnores } from 'eslint/config';
import config from './.eslintrc.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  globalIgnores(['lib/rewrite']),
  ...compat.extends('next', 'next/core-web-vitals', 'next/typescript'),
  ...compat.config({
    ...config,
    ignorePatterns: ['package/*', 'build/*', '.next/*', 'node_modules/*', 'dist/*', '*.tsbuildinfo', 'cli.mjs', '*.mjs', '*.config.ts', '*.config.js', '*.cjs', '*.d.ts'],
  }),
];

export default eslintConfig;
