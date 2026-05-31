import { describe, expect, it } from 'vitest';
import { recordStringsEqual, stringArraysEqual, textChanged } from './form-changes';

describe('textChanged', () => {
	it('ignores leading and trailing whitespace', () => {
		expect(textChanged('  hello  ', 'hello')).toBe(false);
		expect(textChanged('hello', 'world')).toBe(true);
	});
});

describe('stringArraysEqual', () => {
	it('compares arrays regardless of order', () => {
		expect(stringArraysEqual(['a', 'b'], ['b', 'a'])).toBe(true);
		expect(stringArraysEqual(['a'], ['a', 'b'])).toBe(false);
	});
});

describe('recordStringsEqual', () => {
	it('compares only the selected keys', () => {
		const a = { x: '1', y: '2' };
		const b = { x: '1', y: '9' };
		expect(recordStringsEqual(a, b, ['x'])).toBe(true);
		expect(recordStringsEqual(a, b, ['x', 'y'])).toBe(false);
	});
});
