/** True when trimmed text differs from the original value. */
export function textChanged(current: string, original: string): boolean {
	return current.trim() !== original.trim();
}

/** Compare two string arrays regardless of order. */
export function stringArraysEqual(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	const sortedA = [...a].sort();
	const sortedB = [...b].sort();
	return sortedA.every((value, index) => value === sortedB[index]);
}

/** Compare selected keys on two string record objects. */
export function recordStringsEqual<T extends Record<string, string>>(
	a: T,
	b: T,
	keys: readonly (keyof T)[]
): boolean {
	return keys.every((key) => a[key] === b[key]);
}
