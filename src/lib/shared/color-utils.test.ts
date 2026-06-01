import { describe, expect, it } from 'vitest';
import { hexToHsl, hslToHex } from './color-utils';

describe('color-utils', () => {
	it('round-trips common hex colors', () => {
		for (const hex of ['#3b82f6', '#22c55e', '#ef4444', '#a8a29e']) {
			const hsl = hexToHsl(hex);
			expect(hsl).not.toBeNull();
			expect(hslToHex(hsl!.h, hsl!.s, hsl!.l)).toBe(hex);
		}
	});

	it('returns null for invalid hex', () => {
		expect(hexToHsl('blue')).toBeNull();
		expect(hexToHsl('#fff')).toBeNull();
	});
});
