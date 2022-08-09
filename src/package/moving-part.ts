import type { ITemplatePart, ITemplateVaryingPart } from './interface';

export function intersect(a: ITemplatePart, b: ITemplatePart): ITemplatePart | undefined {
	if (typeof a === 'number') {
		if (typeof b === 'number') {
			return a === b ? a : undefined;
		}
		return intersectPrimitive(a, b);
	}
	if (typeof b === 'number') {
		return intersectPrimitive(b, a);
	}
	return intersectSets(a, b);
}

function intersectPrimitive(a: number, b: ITemplateVaryingPart): ITemplatePart | undefined {
	if (!b.has(a)) {
		return undefined;
	}
	if (b.size === 1) {
		return a;
	}
	let lastValue = 0;
	let newSet: Set<number> = new Set();
	for (lastValue of b) {
		newSet.add(lastValue);
	}
	if (newSet.size === 1) {
		return lastValue;
	}
	return newSet;
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

/** kept \ excluded  */
export function exclude(filtered: ITemplatePart, excluded: ITemplatePart): ITemplatePart | undefined {
	if (typeof filtered === 'number') {
		if (typeof excluded === 'number') {
			return excluded === filtered ? undefined : filtered;
		}
		return excluded.has(filtered) ? undefined : filtered;
	}
	if (typeof excluded === 'number') {
		return excludePrimitive(filtered, excluded);
	}
	return excludeSet(filtered, excluded);
}

function excludeSet(filtered: ITemplateVaryingPart, excluded: ITemplateVaryingPart,): ITemplatePart | undefined {
	if (excluded.size === 0) {
		return filtered;
	}
	let lastValue = 0;
	const newSet: Set<number> = new Set();
	for (const value of filtered) {
		if (excluded.has(value)) {
			continue;
		}
		lastValue = value;
		newSet.add(value);
	}
	if (newSet.size === 0) {
		return undefined;
	}
	if (newSet.size === 1) {
		return lastValue!;
	}
	return newSet;
}

function excludePrimitive(filtered: ITemplateVaryingPart, excluded: number): ITemplatePart | undefined {
	if (!filtered.has(excluded)) {
		return filtered;
	}
	let lastValue = 0;
	const newSet: Set<number> = new Set();
	for (const value of filtered) {
		if (value === excluded) {
			continue;
		}
		lastValue = value;
		newSet.add(value);
	}
	if (newSet.size === 0) {
		return undefined;
	}
	if (newSet.size === 1) {
		return lastValue!;
	}
	return newSet;
}