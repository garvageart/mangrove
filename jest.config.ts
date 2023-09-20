import { IS_ENV } from './src/globals';

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/**'],
  collectCoverage: IS_ENV.development ? false : true,
  coverageReporters: ['text', 'json-summary'],
  verbose: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  }
};