import type { ITemplate, ProcessingState, IFoundBackref } from './interface.js';
import { bucketed, getLowerBoundIndex } from './alcorhythms.js';
import { intersect } from './moving-part.js';
import { TemplateError } from './template.js';

/**
 * Tries to infer some values by matching the {@link ITemplate} with itself.
 * ```text
 * ┌─┬─┬─┬─┬─╔═╤═╤═╗─┐
 * │A│B│C│D│x║B│?│D║y│
 * └─┴─┴─┴─┼─╟─┼─┼─╢─┼─┬─┬─┬─┐
 *         │A║B│C│D║x│B│?│D│y│
 *         └─╚═╧═╧═╝─┴─┴─┴─┴─┘
 *            ? = C
 * ```  
 */
export function * inferFromBackrefs (processingState: Pick<ProcessingState, 'template' | 'dataStartOffset'>): IterableIterator<Pick<ProcessingState, 'template' | 'usedBackrefIndices'>> {
	const { template, dataStartOffset } = processingState;

	const candidates = Array.from(backrefCandidates(template, dataStartOffset)).sort((a, b) => {
		return (
			// Prefer longer backrefs
			b.length - a.length
		) || (
			// Prefer shorter distances
			(a.usedOffset - a.referencedOffset) - (b.usedOffset - b.referencedOffset)
		);
	});

	const buckets: IFoundBackref[][] = [];
	for (const bucketedByLength of bucketed(candidates, backref => backref.length)) {
		for (const bucket of bucketed(bucketedByLength, getExtraCodesLength)) {
			buckets.push(bucket);
		}
	}

	let rv: { template: ITemplate, usedBackrefIndices: ReadonlyMap<number, IFoundBackref>}[] = [
		{ template, usedBackrefIndices: new Map() }
	];
	for (const bucket of buckets) {
		let tier = [];
		for (const { template, usedBackrefIndices } of rv) {
			tier.push(...applyBucket(template, bucket, usedBackrefIndices));
		}
		rv = tier;
	}

	console.log(rv.map(v => v.usedBackrefIndices.size));

	yield * rv;
}

function * applyBucket(template: ITemplate, bucket: IFoundBackref[], usedBackrefIndices: ReadonlyMap<number, IFoundBackref>) {
	bucket = bucket.filter(backref => {
		for (let i = 0; i < backref.length; i++) {
			if (usedBackrefIndices.has(backref.usedOffset + i)) {
				return false;
			}
		}
		return true;
	});
	for (const v of _applyBucket(template, bucket, usedBackrefIndices, 0)) {
		if ('conflicting' in v) {
			throw new Error('Unreachable');
		}
		yield v;
	}
}

function * _applyBucket(template: ITemplate, bucket: IFoundBackref[], usedBackrefIndices: ReadonlyMap<number, IFoundBackref>, index = 0): IterableIterator<
	{ template: ITemplate, usedBackrefIndices: ReadonlyMap<number, IFoundBackref> } |
	{ conflicting: IFoundBackref }
> {
	if (index >= bucket.length) {
		yield { template, usedBackrefIndices };
		return;
	}
	const backref = bucket[index];
	for (let i = 0; i < backref.length; i++) {
		const conflicting = usedBackrefIndices.get(backref.usedOffset + i);
		if (conflicting) {
			yield * _applyBucket(template, bucket, usedBackrefIndices, index + 1);
			yield { conflicting };
			return;
		}
	}

	let newTemplate = template;
	try {
		newTemplate = applyBackref(backref, template);
	} catch (e) {
		if (!(e instanceof TemplateError)) {
			throw e; // rethrow
		}
	}
	if (newTemplate === template) {
		yield * _applyBucket(template, bucket, usedBackrefIndices, index + 1);
		return;
	}
	let newUsedBackrefIndices = new Map(usedBackrefIndices);
	for (let i = 0; i < backref.length; i++) {
		newUsedBackrefIndices.set(backref.usedOffset + i, backref);
	}

	let hadConflicts = false;
	for (const v of _applyBucket(newTemplate, bucket, newUsedBackrefIndices, index + 1)) {
		if ('conflicting' in v && v.conflicting === backref) {
			hadConflicts = true;
		} else {
			yield v;
		}
	}
	if (hadConflicts) {
		yield * _applyBucket(template, bucket, usedBackrefIndices, index + 1);
	}
}

function applyBackref({usedOffset, referencedOffset, length } : IFoundBackref, template: ITemplate): ITemplate {
	for (let i = 0; i < length; i++) {
		const referencedPart = template.contents[referencedOffset + i];
		const usedPart = template.contents[usedOffset + i];
		if (referencedPart === usedPart) {
			continue;
		}
		if (!template.isMatching(referencedOffset + i, usedOffset + i)) {
			throw new TemplateError('Parts cannot be merged');
		}
		const intersection = intersect(referencedPart, usedPart)!;
		if (typeof referencedPart !== 'number') {
			template = template.replacePart(referencedPart, intersection);
		}
		if (typeof usedPart !== 'number') {
			template = template.replacePart(usedPart, intersection);
		}
	}
	return template;
}

function * backrefCandidates(
	template: ITemplate,
	dataStartOffset = 0
): IterableIterator<IFoundBackref> {
	const templateMax = template.contents.length - 1;
	for (let stride = template.contents.length - 3; stride > 0; stride--) {
		let length = 0;
		for (
			let referencedOffset = templateMax - stride, usedOffset = templateMax;
			referencedOffset >= 0 && usedOffset >= dataStartOffset;
			referencedOffset--, usedOffset--
		) {
			if (!template.isMatching(referencedOffset, usedOffset)) {
				length = 0;
				continue;
			}
			length++;
			for (let reportedLength = length; reportedLength >= 3; reportedLength--) {
				yield { referencedOffset, usedOffset, length: reportedLength };
			}
		}
	}
}

/**
 * Different backref distances ore encoded with the different amounts of
 * extra bits. Naturally, we want it to be as short as possible.
 * @see {@link https://www.ietf.org/rfc/rfc1951.txt}, page 11
 */
const distanceExtraCodesBreakpoints = [
	1, 5, 9, 17, 33, 65, 129, 257, 513, 1025, 2049, 4097, 8193, 16385
];


function getExtraCodesLength(backref: IFoundBackref): number {
	return getLowerBoundIndex(distanceExtraCodesBreakpoints, backref.usedOffset - backref.referencedOffset);
}