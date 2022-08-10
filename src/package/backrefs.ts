import type { IAssumption, ITemplate, ITemplatePart, ITemplateVaryingPart } from './interface';

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
export function inferFromBackrefs(
	template: ITemplate,
	assumption: IAssumption,
	dataStartOffset = 0
) {
	const usedOffsets: Set<number> = new Set();
	const candidates = Array.from(backrefCandidates(template, assumption, dataStartOffset)).sort((a, b) => {
		return (
			// Prefer longer backrefs
			b.length - a.length
		) || (
			// Prefer shorter distances
			(a.usedOffset - a.referencedOffset) - (b.usedOffset - b.referencedOffset)
		);
	});
	for (const backref of candidates) {
		const newAssumption = tryApplyBackref(backref, assumption, template, usedOffsets);
		if (newAssumption === null) {
			continue;
		}
		debugger;
		assumption = newAssumption;
		for (let i = 0; i < backref.length; i++) {
			usedOffsets.add(backref.usedOffset + i)
		}
	
		console.log(`Accepted ${backref.referencedOffset} -> ${backref.usedOffset}: ${backref.length}`);
		console.log((template as any).dump({
			from: backref.referencedOffset,
			to: backref.referencedOffset + backref.length,
			assumption,
		}));
		console.log((template as any).dump({
			from: backref.usedOffset,
			to: backref.usedOffset + backref.length,
			assumption,
		}));
	}
	return {
		assumption,
		usedOffsets,
	}
}


function tryApplyBackref({usedOffset, referencedOffset, length} : IFoundBackref, assumption: IAssumption, template: ITemplate, usedOffsets: ReadonlySet<number>): IAssumption | null {
	for (let i = 0; i < length; i++) {
		if (usedOffsets.has(usedOffset + i)) {
			// One of these offsets is already using a (better) reference
			return null;
		}
	}
	for (let i = 0; i < length; i++) {
		const referencedValue = template.get(assumption, referencedOffset + i);
		if (referencedValue === undefined) {
			return null;
		}
		const usedValue = template.get(assumption, usedOffset + i);
		if (usedValue === undefined) {
			return null;
		}
		{
			const newAssumption = template.tryNarrowAssumption(assumption, referencedOffset + i, usedValue);
			if (newAssumption === null) {
				return null;
			}
			assumption = newAssumption;
		}
		{
			const newAssumption = template.tryNarrowAssumption(assumption, usedOffset + i, referencedValue);
			if (newAssumption === null) {
				return null;
			}
			assumption = newAssumption;
		}
	}
	return assumption;
}

function * backrefCandidates(
	template: ITemplate,
	assumption: IAssumption,
	dataStartOffset = 0
): IterableIterator<IFoundBackref> {
	debugger;
	const templateMax = template.contents.length - 1;
	for (let stride = template.contents.length - 3; stride > 0; stride--) {
		let length = 0;
		for (
			let referencedOffset = templateMax - stride, usedOffset = templateMax;
			referencedOffset >= 0 && usedOffset >= dataStartOffset;
			referencedOffset--, usedOffset--
		) {
			if (!template.isMatching(assumption, referencedOffset, usedOffset)) {
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
