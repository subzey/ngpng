import type { ITemplatePart, ITemplateVaryingPart } from './interface.js';

export function intersect(a: ITemplatePart, b: ITemplatePart): ITemplatePart | undefined {
	if (typeof a === 'number') {
		if (typeof b === 'number') {
			return a === b ? a : undefined;
		}
		return b.has(a) ? a : undefined;
	}
	if (typeof b === 'number') {
		return a.has(b) ? b : undefined;
	}
	return intersectSets(a, b);
}

function intersectSets(a: ITemplateVaryingPart, b: ITemplateVaryingPart): ITemplatePart | undefined {
	const newSet: Set<number> = new Set();
	let lastValue = 0;

	const larger = a.size > b.size ? a : b;
	const smaller = larger === b ? a : b;
	for (const value of smaller) {
		if (larger.has(value)) {
			lastValue = value;
			newSet.add(value);
		}
	}
	if (newSet.size === 0) {
		return undefined;
	}
	if (newSet.size === 1) {
		return lastValue!;
	}
	return newSet;
}
