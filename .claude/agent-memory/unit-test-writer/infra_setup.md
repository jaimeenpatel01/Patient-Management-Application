---
name: Testing Infrastructure Setup
description: Jest + ts-jest config choices for this Expo TypeScript project — what works and why
type: project
---

## What is installed

devDependencies added: `jest`, `ts-jest`, `@types/jest`, `jest-environment-jsdom` (jsdom unused for now but available for future component tests).

## jest.config.js pattern

```js
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.test.json' }],
  },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  transformIgnorePatterns: ['node_modules'],
};
```

**Why:** The Expo base tsconfig uses `"module": "esnext"` which ts-jest cannot consume. A separate `tsconfig.test.json` overrides to `"module": "commonjs"`.

## tsconfig.test.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "commonjs",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "isolatedModules": false
  }
}
```

## Test file placement

All test files are in `__tests__/` subdirectories:
- `src/lib/__tests__/*.test.ts`
- `src/services/__tests__/*.test.ts`

The mock helper lives at `src/services/__tests__/__mocks__/supabase.ts`.

## npm scripts

```json
"test": "jest",
"test:coverage": "jest --coverage",
"test:watch": "jest --watch"
```

## Deprecation to avoid

Do NOT use `globals: { 'ts-jest': { tsconfig: ... } }` — that pattern is deprecated in ts-jest v29+. Always pass tsconfig inside the transform tuple.
