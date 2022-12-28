import {describe, expect, test} from 'vitest';
import {parseSize} from './lib.js';

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
