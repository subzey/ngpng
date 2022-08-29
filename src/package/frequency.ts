import type { ITemplate, ITemplatePart, ITemplateVaryingPart, ProcessingState } from './interface.js';
import { TemplateError } from './template.js';

export function inferFromFrequency(
	processingState: Pick<ProcessingState, 'template' | 'dataStartOffset' | 'usedBackrefIndices'>
): Pick<ProcessingState, 'template'> {
	const { template, dataStartOffset, usedBackrefIndices } = processingState;
	const buckets = bucketedByOccurence(template, usedBackrefIndices, dataStartOffset);
	let newTemplate = template;
	while (buckets.length > 0) {
		const bucket = buckets.pop()!;
		let bestNewOccurences = -Infinity;
		let bestCandidate: { value: number, template: ITemplate } | null = null;
		for (const candidate of applyAllValues(newTemplate, bucket)) {
			const newOccurences = getOccurences(newTemplate, usedBackrefIndices, dataStartOffset, candidate.value);
			if (newOccurences > bestNewOccurences) {
				bestCandidate = candidate;
				bestNewOccurences = newOccurences;
			}
		}
		if (bestCandidate === null) {
			continue;
		}
		bucket.delete(bestCandidate.value);
		if (bucket.size > 0) {
			buckets.push(bucket);
		}
		newTemplate = bestCandidate.template;
	}
	return {
		template: newTemplate,
	};
}

function * applyAllValues(template: ITemplate, values: ReadonlySet<number>): IterableIterator<{ value: number, template: ITemplate }> {
	for (const value of values) {
		yield * applyValue(template, value);
	}
}

function * applyValue(template: ITemplate, value: number): IterableIterator<{ value: number, template: ITemplate }> {
	const matchingParts: Set<ITemplateVaryingPart> = new Set();
	for (const part of template.contents) {
		if (typeof part === 'number') {
			continue;
		}
		if (!part.has(value)) {
			continue;
		}
		matchingParts.add(part);
	}
	if (matchingParts.size === 0) {
		return;
	}
	const partsQueue = [...matchingParts];
	for (let startIndex = 0; startIndex < partsQueue.length; startIndex++) {
		let newTemplate = template;
		for (let i = 0; i < partsQueue.length; i++) {
			const index = (startIndex + i) % partsQueue.length;
			try {
				newTemplate = newTemplate.replacePart(partsQueue[index], value);
			} catch (e) {
				if (e instanceof TemplateError) {
					continue;
				} else {
					throw e;
				}
			}
		}
		if (newTemplate !== template) {
			yield { value, template: newTemplate };
		}
	}
}

function getStats(template: ITemplate, usedBackrefIndices: ReadonlyMap<number, unknown>, dataStartOffset: number): Map<number, number> {
	const stats: Map<number, number> = new Map();
	for (let i = 0; i < 256; i++) {
		stats.set(i, 0);
	}
	for (let i = dataStartOffset; i < template.contents.length; i++) {
		if (usedBackrefIndices.has(i)) {
			continue;
		}
		const item = template.contents[i];
		if (typeof item !== 'number') {
			continue;
		}
		stats.set(item, stats.get(item)! + 1);
	}
	return stats;
}

function bucketedByOccurence(template: ITemplate, usedBackrefIndices: ReadonlyMap<number, unknown>, dataStartOffset: number): Set<number>[] {
	const rv: Set<number>[] = [];
	let lastOccurences = -Infinity;
	const stats = getStats(template, usedBackrefIndices, dataStartOffset);
	const sorted = [...stats].sort((a, b) => (
		// Occurences, rare -> often
		(a[1] - b[1]) ||
		// Readability, more readable -> less readable
		(readability(b[0])) - readability(a[0])) ||
		// CharCode. Just for stability
		(a[0] - b[0])
	);
	for (const [value, occurences] of sorted) {
		if (occurences > lastOccurences) {
			rv.push(new Set());
			lastOccurences = occurences;
		}
		if (occurences >= lastOccurences) {
			rv[rv.length - 1].add(value);
		}
	}
	return rv;
}

function getOccurences(template: ITemplate, usedBackrefIndices: ReadonlyMap<number, unknown>, dataStartOffset: number, value: number): number {
	let count = 0;
	for (let i = dataStartOffset; i < template.contents.length; i++) {
		if (usedBackrefIndices.has(i)) {
			continue;
		}
		if (template.contents[i] === value) {
			count++;
		}
	}
	return count;
}

function readability(value: number) {
	// Space and readable ASCII
	if (value >= 0x20 && value <= 0x7e) {
		return 4;
	}
	// U+0080..U+00FF, whatever it is
	if (value >= 0x80) {
		return 3;
	}
	// \t and \n
	if (value === 9 || value === 10) {
		return 2;
	}
	// \r
	if (value === 13) {
		return 1;
	}
	// NUL, DEL, and all the special chars 
	return 0;
}