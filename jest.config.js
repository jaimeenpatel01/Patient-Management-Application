/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // Use ts-jest via the modern transform config (not the deprecated globals approach)
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.test.json' }],
  },
  // Resolve @/* path alias to src/*
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Run __tests__/*.test.ts files under src/
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  // Do not transform node_modules
  transformIgnorePatterns: ['node_modules'],
  // Coverage sources
  collectCoverageFrom: [
    'src/services/patientService.ts',
    'src/services/attendanceService.ts',
    'src/services/paymentService.ts',
    'src/lib/validators.ts',
    'src/lib/formatters.ts',
    'src/lib/errorMessages.ts',
  ],
};
