/** A set of possible byte values */
export type ITemplateVaryingPart = ReadonlySet<number>;

/** A set of possible byte values or a concrete numeric value */
export type ITemplatePart = ITemplateVaryingPart | number;

// FIXME
export interface ITemplate extends Template {}

/** Thrown when we cannot return a valid Template for some reason */
export class TemplateError extends Error {}

export class Template {
	public readonly contents: readonly ITemplatePart[];
	public readonly exclusiveGroups: readonly (ReadonlySet<ITemplateVaryingPart>)[];

	constructor(contents: readonly ITemplatePart[], exclusiveGroups: readonly (ReadonlySet<ITemplateVaryingPart>)[] = []) {
		this.exclusiveGroups = exclusiveGroups;
		this.contents = contents;
	}

	static merge(...templates: readonly ITemplate[]): Template {
		const newContents: ITemplatePart[] = [];
		const newExclusiveGroups: ReadonlySet<ITemplateVaryingPart>[] = [];

		for (const template of templates) {
			newContents.push(...template.contents);
			newExclusiveGroups.push(...template.exclusiveGroups);
		}

		return new this(newContents, newExclusiveGroups);
	}

	public isMatching(indexA: number, indexB: number): boolean {
		if (
			indexA < 0 || indexA >= this.contents.length ||
			indexB < 0 || indexB >= this.contents.length
		) {
			throw new RangeError(`Index is out of bounds`);
		}
		const valueA = this.contents[indexA];
		const valueB = this.contents[indexB];

		if (valueA === valueB) {
			return true;
		}

		if (typeof valueA === 'number') {
			if (typeof valueB === 'number') {
				return valueA === valueB;
			}
			return valueB.has(valueA);
		}
		if (typeof valueB === 'number') {
			return valueA.has(valueB);
		}

		for (const exclusiveGroup of this.exclusiveGroups) {
			if (exclusiveGroup.has(valueA) && exclusiveGroup.has(valueB)) {
				return false;
			}
		}

		const smallerSet = valueA.size < valueB.size ? valueA : valueB;
		const biggerSet = valueA === smallerSet ? valueB : valueA;
		for (const v of smallerSet) {
			if (biggerSet.has(v)) {
				return true;
			}
		}

		return false;
	}

	public replacePart(replacedPart: ITemplateVaryingPart, replaceWith: ITemplatePart): Template {
		if (replacedPart === replaceWith) {
			// Too easy
			return this;
		}

		const replacements: Map<ITemplateVaryingPart, ITemplatePart> = new Map();
		replacements.set(replacedPart, replaceWith);

		if (typeof replaceWith === 'number') {
			for (const exclusiveGroup of this.exclusiveGroups) {
				if (!exclusiveGroup.has(replacedPart)) {
					// Completely unrelated group
					continue;
				}
				for (const part of exclusiveGroup) {
					if (!part.has(replaceWith)) {
						// Nothing to patch
						continue;
					}
					if (replacements.has(part)) {
						// Already patched
						continue;
					}

					const newPart = new Set(part);
					newPart.delete(replaceWith);
					if (newPart.size === 0) {
						throw new TemplateError('Template part is an empty set');
					}
					replacements.set(part, newPart);
				}
			}
		}

		const newExclusiveGroups: ReadonlySet<ITemplateVaryingPart>[] = [];
		for (const oldExclusiveGroup of this.exclusiveGroups) {
			let newExclusiveGroup: Set<ITemplateVaryingPart> | null = null;
			for (const part of oldExclusiveGroup) {
				if (!replacements.has(part)) {
					continue;
				}
				const newPart = replacements.get(part)!;
				newExclusiveGroup ??= new Set(oldExclusiveGroup);
				newExclusiveGroup.delete(part);
				if (typeof newPart !== 'number') {
					newExclusiveGroup.add(newPart);
				}
			}
			if (newExclusiveGroup === null) {
				newExclusiveGroups.push(oldExclusiveGroup);
				continue;
			}

			// (Dirty) check if new value is applicable
			if (newExclusiveGroup !== null) {
				const possibleValues: Set<number> = new Set();
				for (const part of newExclusiveGroup) {
					if (typeof part === 'number') {
						possibleValues.add(part);
					} else {
						for (const v of part) {
							possibleValues.add(v);
						}
					}
				}
				if (possibleValues.size < newExclusiveGroup.size) {
					throw new TemplateError('Exclusive groups invariant cannot be met');
				}
			}
			if (newExclusiveGroup.size > 1) {
				newExclusiveGroups.push(newExclusiveGroup);
			}
		}

		let newContents: ITemplatePart[] = [];

		for (const part of this.contents) {
			if (typeof part !== 'number' && replacements.has(part)) {
				newContents.push(replacements.get(part)!);
			} else {
				newContents.push(part);
			}
		}

		const newTemplate = new Template(newContents, newExclusiveGroups);
		for (const part of newTemplate.contents) {
			if (typeof part !== 'number' && part.size === 1) {
				// Convert degenerate sets into number.
				// This also helps to keep the exclusive group invariant better
				// We pick only the first one: After some recursive calls
				// all the parts should be processed.
				return newTemplate.replacePart(part, [...part][0]);
			}
		}
		return newTemplate;
	}

	public dump({
		from = 0,
		to = Infinity
	}: {
		from?: number;
		to?: number;
	} = {}) {
		let rv = '';
		const fmt = (charCode: number): string => {
			if (charCode === 0x0A || charCode === 0x0D) {
				return '⏎';
			}
			if (charCode === 0x09) {
				return '⭾';
			}
			return String.fromCharCode(charCode);
		}
	
		let lastColorPhase = 0;
		const colorBySet: Map<ITemplatePart, string> = new Map();
		const start = Math.max(Math.ceil(from), 0);
		const end = Math.min(to, this.contents.length);

		for (let i = start; i < end; i++) {
			const item = this.contents[i];
			if (typeof item === 'number') {
				rv += fmt(item);
			} else {
				let ansiColor = colorBySet.get(item);
				if (ansiColor === undefined) {
					ansiColor = [
						Math.round((Math.cos(lastColorPhase + 0 * Math.PI * 2 / 3) + 1) * 127.5),
						Math.round((Math.cos(lastColorPhase + 1 * Math.PI * 2 / 3) + 1) * 127.5),
						Math.round((Math.cos(lastColorPhase + 2 * Math.PI * 2 / 3) + 1) * 127.5),
					].join(';')
					lastColorPhase += Math.PI * 2 * (2 / (1 + Math.sqrt(5)));
					colorBySet.set(item, ansiColor);
				}
				rv += `\u001b[30m\u001b[48;2;${ansiColor}m` + Array.from(item, fmt).join('') + '\u001b[39;49m';
			}
		}
		return rv;
	}
}