/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    rootDir: '..',
    testMatch: ['<rootDir>/tests/**/*.test.ts'],
    extensionsToTreatAsEsm: ['.ts'],

    transform: {
        '^.+\\.ts$': ['ts-jest', {
            useESM: true,
            tsconfig: 'tests/tsconfig.test.json',
            diagnostics: false,
        }],
    },

    moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/shared/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
        // Mock cloudinary to prevent real network calls in all tests
        '^.*/upload/cloudinary$': '<rootDir>/tests/mocks/cloudinary.mock.ts',
        '^.*/upload/cloudinary\\.ts$': '<rootDir>/tests/mocks/cloudinary.mock.ts',
        // Mock vite.ts to avoid import.meta.dirname (not supported in Jest CJS)
        '^.*/vite$': '<rootDir>/tests/mocks/vite.mock.ts',
        '^.*/vite\\.ts$': '<rootDir>/tests/mocks/vite.mock.ts',
    },

    globalSetup: '<rootDir>/tests/setup/global-setup.ts',
    globalTeardown: '<rootDir>/tests/setup/global-teardown.ts',



    testTimeout: 120000,
    verbose: true,
    forceExit: true,

    coverageDirectory: '<rootDir>/coverage',
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/tests/',
        '/client/',
        '/dist/',
    ],
    coverageThreshold: {
        global: {
            lines: 55,
            functions: 65,
            branches: 40,
        },
    },
};
