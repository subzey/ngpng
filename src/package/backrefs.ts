import { intersect } from './moving-part.js';
import type { ITemplate } from './template.js'

interface IFoundBackref {
	referencedOffset: number;
	usedOffset: number;
	length: number;
}

/**
 * Tries to infer some values by matching the {@link template} with itself.
 * ```text
 * ┌─┬─┬─┬─┬─╔═╤═╤═╗─┐
 * │A│B│C│D│x║B│?│D║y│
 * └─┴─┴─┴─┼─╟─┼─┼─╢─┼─┬─┬─┬─┐
 *         │A║B│C│D║x│B│?│D│y│
 *         └─╚═╧═╧═╝─┴─┴─┴─┴─┘
 *            ? = C
 * ```  
 */
export function inferFromBackrefs({
	template,
	dataStartOffset = 0
}: {
	template: ITemplate;
	dataStartOffset: number;
}) {
	console.log(dataStartOffset);
	const usedBackrefIndices: Set<number> = new Set();
	const candidates = Array.from(backrefCandidates(template, dataStartOffset)).sort((a, b) => {
		return (
			// Prefer longer backrefs
			b.length - a.length
		) || (
			// Prefer shorter distances
			(a.usedOffset - a.referencedOffset) - (b.usedOffset - b.referencedOffset)
		);
	});
	for (const backref of candidates) {
		console.log(backref);
		try {
			template = applyBackref(backref, template, usedBackrefIndices);
			for (let i = 0; i < backref.length; i++) {
				usedBackrefIndices.add(backref.usedOffset + i);
			}
			console.log(`Accepted ${backref.referencedOffset} -> ${backref.usedOffset}: ${backref.length}`);
			console.log(template.dump({
				from: backref.referencedOffset,
				to: backref.referencedOffset + backref.length,
			}));
			console.log(template.dump({
				from: backref.usedOffset,
				to: backref.usedOffset + backref.length,
			}));
		} catch (e) {
			console.log(e);
			// Nothing;
		}
	}
	return {
		template,
		dataStartOffset,
		usedBackrefIndices,
	};
}


function applyBackref({usedOffset, referencedOffset, length } : IFoundBackref, template: ITemplate, usedBackrefIndices: ReadonlySet<number>): ITemplate {
	for (let i = 0; i < length; i++) {
		if (usedBackrefIndices.has(usedOffset + i)) {
			throw new Error('One of the offsets is already using a (better) reference');
		}
	}
	for (let i = 0; i < length; i++) {
		const referencedPart = template.contents[referencedOffset + i];
		const usedPart = template.contents[usedOffset + i];
		if (referencedPart === usedPart) {
			continue;
		}
		const intersection = intersect(referencedPart, usedPart);
		if (intersection === undefined) {
			throw new Error('Parts are no longer intersecting');
		}
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
