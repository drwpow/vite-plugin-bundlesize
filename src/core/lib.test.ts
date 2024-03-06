import {describe, expect, test} from 'vitest';
import {padLeft, padRight, parseSize} from './lib.js';

describe('parseSize', () => {
  const tests: [string, number][] = [
    ['2000', 2000],
    ['2000b', 2000],
    ['200k', 200000],
    ['0.001 kilobytes', 1],
    ['200 kB', 200000],
    ['5.2M', 5200000],
  ];

  test.each(tests)('%s', (given, expected) => {
    expect(parseSize(given)).toBe(expected);
  });
});

describe('padLeft', () => {
  test('ignores negative numbers', () => {
    expect(padLeft('myString', -10)).toBe('myString');
  });
});

describe('padRight', () => {
  test('ignores negative numbers', () => {
    expect(padRight('myString', -10)).toBe('myString');
  });
});
