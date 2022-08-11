import type { ITemplatePart, ITemplateVaryingPart } from './interface.js';
import { TemplateError } from './template.js';

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

function assertIsNumeric(array: readonly unknown[]): asserts array is number[] {
	for (let i = 0; i < array.length; i++) {
		if (typeof array[i] !== 'number') {
			throw new TemplateError(`Template part at index ${i} is not a number`);
		}
	}
}

// /** kept \ excluded  */
// export function exclude(filtered: ITemplatePart, excluded: ITemplatePart): ITemplatePart | undefined {
// 	if (typeof filtered === 'number') {
// 		if (typeof excluded === 'number') {
// 			return excluded === filtered ? undefined : filtered;
// 		}
// 		return excluded.has(filtered) ? undefined : filtered;
// 	}
// 	if (typeof excluded === 'number') {
// 		return excludePrimitive(filtered, excluded);
// 	}
// 	return excludeSet(filtered, excluded);
// }

// function excludeSet(filtered: ITemplateVaryingPart, excluded: ITemplateVaryingPart,): ITemplatePart | undefined {
// 	if (excluded.size === 0) {
// 		return filtered;
// 	}
// 	let lastValue = 0;
// 	const newSet: Set<number> = new Set();
// 	for (const value of filtered) {
// 		if (excluded.has(value)) {
// 			continue;
// 		}
// 		lastValue = value;
// 		newSet.add(value);
// 	}
// 	if (newSet.size === 0) {
// 		return undefined;
// 	}
// 	if (newSet.size === 1) {
// 		return lastValue!;
// 	}
// 	return newSet;
// }

// function excludePrimitive(filtered: ITemplateVaryingPart, excluded: number): ITemplatePart | undefined {
// 	if (!filtered.has(excluded)) {
// 		return filtered;
// 	}
// 	let lastValue = 0;
// 	const newSet: Set<number> = new Set();
// 	for (const value of filtered) {
// 		if (value === excluded) {
// 			continue;
// 		}
// 		lastValue = value;
// 		newSet.add(value);
// 	}
// 	if (newSet.size === 0) {
// 		return undefined;
// 	}
// 	if (newSet.size === 1) {
// 		return lastValue!;
// 	}
// 	return newSet;
// }