export const preset = 'ts-jest';
export const testEnvironment = 'node';
export const testMatch = [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.js',
    '**/*.test.ts',
    '**/*.test.js',
];
export const moduleNameMapper = {
    '^@/(.*)$': '<rootDir>/src/$1',
};
export const collectCoverageFrom = [
    'src/**/*.{ts,js}',
    '!src/**/*.test.{ts,js}',
    '!src/**/*.d.ts',
];
export const testPathIgnorePatterns = ['/node_modules/', '/dist/'];
export const transform = {
    '^.+\\.tsx?$': ['ts-jest', {
        tsconfig: 'jest.tsconfig.json',
    }],
    '^.+\\.jsx?$': ['ts-jest', {
        tsconfig: 'jest.tsconfig.json',
    }],
};
export const transformIgnorePatterns = [
    'node_modules/(?!(obsidian-daily-notes-interface)/)',
];
export const moduleFileExtensions = ['ts', 'tsx', 'js', 'jsx', 'json', 'node'];
