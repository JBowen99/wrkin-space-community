export type Hsl = {
	h: number;
	s: number;
	l: number;
};

export function hexToHsl(hex: string): Hsl | null {
	const rgb = hexToRgb(hex);
	if (!rgb) return null;
	return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const normalized = hex.trim().toLowerCase();
	if (!/^#[0-9a-f]{6}$/.test(normalized)) return null;
	const value = Number.parseInt(normalized.slice(1), 16);
	return {
		r: (value >> 16) & 255,
		g: (value >> 8) & 255,
		b: value & 255
	};
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const l = (max + min) / 2;

	let h = 0;
	let s = 0;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case rn:
				h = (gn - bn) / d + (gn < bn ? 6 : 0);
				break;
			case gn:
				h = (bn - rn) / d + 2;
				break;
			default:
				h = (rn - gn) / d + 4;
				break;
		}
		h /= 6;
	}

	return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
	const { r, g, b } = hslToRgb(h, s, l);
	return rgbToHex(r, g, b);
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
	const hn = ((h % 360) + 360) % 360;
	const sn = Math.max(0, Math.min(100, s)) / 100;
	const ln = Math.max(0, Math.min(100, l)) / 100;

	if (sn === 0) {
		const gray = Math.round(ln * 255);
		return { r: gray, g: gray, b: gray };
	}

	const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
	const p = 2 * ln - q;
	const hk = hn / 360;

	const hueToChannel = (t: number) => {
		let channel = t;
		if (channel < 0) channel += 1;
		if (channel > 1) channel -= 1;
		if (channel < 1 / 6) return p + (q - p) * 6 * channel;
		if (channel < 1 / 2) return q;
		if (channel < 2 / 3) return p + (q - p) * (2 / 3 - channel) * 6;
		return p;
	};

	return {
		r: Math.round(hueToChannel(hk + 1 / 3) * 255),
		g: Math.round(hueToChannel(hk) * 255),
		b: Math.round(hueToChannel(hk - 1 / 3) * 255)
	};
}

export function rgbToHex(r: number, g: number, b: number): string {
	const clamp = (channel: number) => Math.max(0, Math.min(255, Math.round(channel)));
	return `#${[clamp(r), clamp(g), clamp(b)]
		.map((channel) => channel.toString(16).padStart(2, '0'))
		.join('')}`;
}

export function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}
