import type { ITemplate, ProcessingState } from './interface.js';
import { bucketed, getLowerBoundIndex } from './alcorhythms.js';
import { intersect } from './moving-part.js';
import { TemplateError } from './template.js';

interface IFoundBackref {
	referencedOffset: number;
	usedOffset: number;
	length: number;
}

interface Retrace {
	bucketIndex: number;
	bucketItemIndex: number;
	template: ITemplate;
	backrefUsageMap: Map<number, { bucketIndex: number, bucketItemIndex: number }>;
}

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

	const retraces: Retrace[] = [{
		bucketIndex: 0,
		bucketItemIndex: 0,
		template,
		backrefUsageMap: new Map(),
	}];

	while (retraces.length > 0) {
		let {
			bucketIndex,
			bucketItemIndex,
			template,
			backrefUsageMap,
		} = retraces.pop()!;

		// console.log('Trace from', bucketIndex, bucketItemIndex);

		for (; bucketIndex < buckets.length; bucketIndex++, bucketItemIndex = 0) {
			const bucket = buckets[bucketIndex];
			const maybeRetraces: Map<number, Retrace> = new Map();
			const willRetraceIndices: Set<number> = new Set();

			nextBackref: for (; bucketItemIndex < bucket.length; bucketItemIndex++) {
				const backref = bucket[bucketItemIndex];
				const conflictedRetraceable: number[] = [];
				for (let i = 0; i < backref.length; i++) {
					const collidingBackrefUsage = backrefUsageMap.get(backref.usedOffset + i);
					if (collidingBackrefUsage) {
						if (collidingBackrefUsage.bucketIndex !== bucketIndex || backref.length > 3) {
							// Not retraceable
							continue nextBackref;
						} else {
							conflictedRetraceable.push(collidingBackrefUsage.bucketItemIndex);
						}
					}
				}
				if (conflictedRetraceable.length > 0) {
					for (const index of conflictedRetraceable) {
						willRetraceIndices.add(index);
					}
					continue nextBackref;
				}

				let newTemplate: ITemplate;
				try {
					newTemplate = applyBackref(backref, template);
				} catch (e) {
					if (e instanceof TemplateError) {
						// That's okay
						continue;
					}
					throw e; // rethrow
				}

				// Save state for a possible retrace
				maybeRetraces.set(bucketItemIndex, {
					backrefUsageMap: new Map(backrefUsageMap), // Shallow copy
					bucketIndex,
					bucketItemIndex: bucketItemIndex + 1, // Skip over this one
					template: template,
				});

				template = newTemplate;
				for (let i = 0; i < backref.length; i++) {
					backrefUsageMap.set(
						backref.usedOffset + i,
						{ bucketIndex, bucketItemIndex }
					)
				}
			}

			for (const willRetraceIndex of willRetraceIndices) {
				// console.log('Will retrace', maybeRetraces.get(willRetraceIndex)!.bucketIndex, maybeRetraces.get(willRetraceIndex)!.bucketItemIndex);
				retraces.push(maybeRetraces.get(willRetraceIndex)!);
			}
		}

		yield {
			template,
			usedBackrefIndices: new Set(backrefUsageMap.keys()),
		}
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