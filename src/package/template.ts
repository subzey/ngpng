import type { ITemplatePart, ITemplateVaryingPart, ITemplate, IAssumption } from "./interface";
import { intersect } from './moving-part.js';

import typescript from 'typescript';

interface IBootstrapVariables {
	_canvas: ITemplateVaryingPart;
	_ctx: ITemplateVaryingPart;
	_zero: ITemplateVaryingPart;
	_evaledString: ITemplateVaryingPart;
	_negative: ITemplateVaryingPart;
}

const MagicFunctions = {
	_anyDigit: createAnyDigit,
	_anyPositiveDigit: createAnyPositiveDigit,
} as const;

type MagicFunctionName = keyof typeof MagicFunctions;

class Template implements ITemplate {
	public readonly contents: readonly ITemplatePart[];
	public readonly exclusiveGroups: readonly (ReadonlySet<ITemplateVaryingPart>)[];
	protected readonly _exclusivesMap: ReadonlyMap<ITemplateVaryingPart, ReadonlySet<ITemplateVaryingPart>>;

	constructor(contents: readonly ITemplatePart[], exclusiveGroups: readonly (ReadonlySet<ITemplateVaryingPart>)[]) {
		this.exclusiveGroups = exclusiveGroups;
		this._exclusivesMap = this._createExclusivesFromArray(exclusiveGroups);
		this.contents = contents;
	}

	static merge(...templates: readonly ITemplate[]): Template {
		return new this(
			([] as ITemplatePart[]).concat(...templates.map(t => t.contents)),
			([] as ReadonlySet<ITemplateVaryingPart>[]).concat(...templates.map(t => t.exclusiveGroups).filter(a => a.length > 0)),
		);
	}

	public get(assumption: IAssumption, index: number): ITemplatePart | undefined {
		if (index < 0 || index >= this.contents.length) {
			return undefined;
		}
		const value = this.contents[index];
		if (typeof value !== 'number' && assumption.has(value)) {
			return assumption.get(value)
		}
		return value;
	}

	public isMatching(assumption: IAssumption, indexA: number, indexB: number): boolean {
		if (
			indexA < 0 || indexA >= this.contents.length ||
			indexB < 0 || indexB >= this.contents.length
		) {
			// Out of bound values never matches
			return false;
		}
		const partA = this.contents[indexA];
		const partB = this.contents[indexB];

		if (typeof partA !== 'number' && typeof partB !== 'number') {
			const exclusiveSet = this._exclusivesMap.get(partA);
			if (exclusiveSet !== undefined && exclusiveSet.has(partB)) {
				// Sets from the same exclusive group cannot match
				// regardless of the assumption
				return false;
			}
		}

		const valueA = (typeof partA !== 'number' && assumption.get(partA)) || partA;
		const valueB = (typeof partB !== 'number' && assumption.get(partB)) || partB;

		if (typeof valueA === 'number') {
			if (typeof valueB === 'number') {
				return valueA === valueB;
			}
			return valueB.has(valueA);
		}
		if (typeof valueB === 'number') {
			return valueA.has(valueB);
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

	public tryNarrowAssumption(prevAssumption: IAssumption, index: number, newValue: ITemplatePart): IAssumption | null {
		const currentValue = this.get(prevAssumption, index);
		if (currentValue === undefined) {
			// No such index: Assumption is invalid
			return null;
		}
		const intersection = intersect(newValue, currentValue);
		if (intersection === undefined) {
			// There's nothing in common: Assumption is invalid
			return null;
		}
		const templatePart = this.contents[index];
		if (typeof templatePart === 'number') {
			// That's a literal value. Assumption is valid, but no new information is provided
			return prevAssumption;
		}
		const newAssumption = new Map(prevAssumption);
		newAssumption.set(templatePart, intersection);
		const exclusiveSet = this._exclusivesMap.get(templatePart);
		if (exclusiveSet === undefined) {
			// Assumption is valid, no constraints to check
			return newAssumption;
		}

		const possibleValues: Set<number> = new Set();
		const affectedParts: Set<ITemplateVaryingPart> = new Set();

		for (let i = 0; i < this.contents.length; i++) {
			const otherPart = this.contents[i];
			if (typeof otherPart === 'number') {
				continue;
			}
			if (otherPart !== templatePart && exclusiveSet.has(otherPart)) {
				// Not of interest
				continue;
			}
			if (affectedParts.has(otherPart)) {
				// We've already checked this
				continue;
			}
			affectedParts.add(otherPart);
			const value = this.get(newAssumption, i);
			if (value === undefined) {
				return null;
			}
			if (typeof value === 'number') {
				possibleValues.add(value);
			} else {
				for (const v of value) {
					possibleValues.add(v);
				}
			}
		}

		if (affectedParts.size > possibleValues.size) {
			// There's not enough values to satisfy constaints
			return null;
		}

		return newAssumption;
	}

	public dump({
		from = 0,
		to = Infinity,
		assumption = new Map()
	}: {
		from?: number;
		to?: number;
		assumption?: IAssumption;
	} = {}) {
		let rv = '';
		const fmt = (charCode: number): string => {
			if (charCode === 0x0A || charCode === 0x0D) {
				return '⮠';
			}
			if (charCode === 0x09) {
				return '⇥';
			}
			return String.fromCharCode(charCode);
		}
	
		let lastColorPhase = 0;
		const colorBySet: Map<ITemplatePart, string> = new Map();
		const start = Math.max(Math.ceil(from), 0);
		const end = Math.min(to, this.contents.length);

		for (let i = start; i < end; i++) {
			const item = this.contents[i];
			const value = this.get(assumption, i)!;
			if (typeof value === 'number') {
				rv += fmt(value);
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
				rv += `\u001b[30m\u001b[48;2;${ansiColor}m` + Array.from(value, fmt).join('') + '\u001b[39;49m';
			}
		}
		return rv;
	}

	private _createExclusivesFromArray(exclusiveGroups: readonly (ReadonlySet<ITemplateVaryingPart>)[]): ReadonlyMap<ITemplateVaryingPart, ReadonlySet<ITemplateVaryingPart>> {
		const exclusives: Map<ITemplateVaryingPart, Set<ITemplateVaryingPart>> = new Map();
		for (const exclusiveGroup of exclusiveGroups) {
			for (const part of exclusiveGroup) {
				if (!exclusives.has(part)) {
					exclusives.set(part, new Set());
				}
				for (const otherPart of exclusiveGroup) {
					if (part === otherPart) {
						continue;
					}
					if (!exclusives.has(otherPart)) {
						exclusives.set(otherPart, new Set());
					}
					exclusives.get(part)!.add(otherPart);
					exclusives.get(otherPart)!.add(part);
				}
			}
		}
		return exclusives;
	}
}

export function createTemplate(sourceText: string, keepNames: ReadonlySet<string> = new Set()) {
	const variables: IBootstrapVariables = {
		_canvas: createVariable('c'),
		_ctx: createVariable('b'),
		_zero: createVariable('t'),
		_evaledString: createVariable('e'),
		_negative: createVariable('p'),
	};
	const onloadTemplate = createJsTemplate(
		"_ctx=_canvas.getContext`2d`;for(_negative=_evaledString='';_zero=_ctx.getImageData(159,0,_anyPositiveDigit(),!_ctx.drawImage(this,_negative--,0)).data[0];)_evaledString+=String.fromCharCode(_zero);(_anyDigit(),eval)(e)",
		variables,
		new Set(),
	);
	const payloadTemplate = createJsTemplate(
		sourceText,
		variables,
		keepNames
	);

	const pngFilter = new Template([ new Set([0, 2]) ], []);
	const [htmlHead, htmlMid, htmlTail] = "<canvas/id=🎨><img/onload=🏭 src=#>".split(/[🎨🏭]/u).map(createHtmlTemplate);

	const mergedTemplate = Template.merge(
		pngFilter,
		htmlHead,
		new Template([variables._canvas], []),
		htmlMid,
		onloadTemplate,
		htmlTail,
		payloadTemplate
	)

	return {
		template: mergedTemplate,
		dataStartOffet: mergedTemplate.contents.length - payloadTemplate.contents.length,
	};
}

function createHtmlTemplate(template: string): Template {
	const templateContents = [] as ITemplatePart[];
	for (const ch of template) {
		if (ch === '/') {
			templateContents.push(createHtmlAttributeSeparator());
			continue;
		}
		if (ch === ' ') {
			templateContents.push(createHtmlWhitespace());
			continue;
		}
		templateContents.push(recase(ch));
	}
	return new Template(templateContents, []);
}

function createJsTemplate(sourceText: string, bootstrapVariables: IBootstrapVariables, keepNames: ReadonlySet<string>): Template {
	const collectedIds: Map<number, { name: string, end: number }> = new Map();
	const collectedQuotes: Map<number, { end: number }> = new Map();
	const collectedMagic: Map<number, { name: MagicFunctionName, end: number }> = new Map();
	const avoidIds: Set<string> = new Set();

	// Serious business
	const sourceFile = typescript.createSourceFile(
		'payload.js',
		sourceText,
		typescript.ScriptTarget.ESNext,
		true,
		typescript.ScriptKind.JS
	);

	const traverse = (node: typescript.Node): void => {
		if (typescript.isCallExpression(node)) {
			const calleeNode = node.expression;
			if (typescript.isIdentifier(calleeNode) && !identifierIsPropertyName(calleeNode)) {
				const calleeName = calleeNode.text;
				if (MagicFunctions.hasOwnProperty(calleeName)) {
					const start = node.getStart(sourceFile);
					const end = node.getEnd();
					collectedMagic.set(start, { name: calleeName as MagicFunctionName, end });
					return;
				}
			}
		}
		if (typescript.isIdentifier(node)) {
			const name = node.text;
			if (keepNames.has(name)) {
				avoidIds.add(name);
			} else if (shouldRenameIdentifier(name, bootstrapVariables, identifierIsPropertyName(node))) {
				const start = node.getStart(sourceFile);
				const end = node.getEnd();
				collectedIds.set(start, { name, end });
			}
			return;
		}
		if (typescript.isStringLiteral(node)) {
			collectedQuotes.set(node.getStart(), { end: node.getEnd() });
			return;
		}
		node.forEachChild(traverse);
	}
	sourceFile.forEachChild(traverse);

	const identifiersByName: Map<string, ITemplateVaryingPart> = new Map();
	const templateContents = [];
	for (let index = 0; index < sourceText.length; index++) {
		if (collectedQuotes.has(index)) {
			// Quote replacement
			const { end } = collectedQuotes.get(index)!;
			const raw = sourceText.slice(index + 1, end - 1);
			if (!/['"]/.test(raw)) {
				const quote = createRegularQuote();
				templateContents.push(quote);
				for (let i = 0; i < raw.length; i++) {
					templateContents.push(raw.charCodeAt(i));
				}
				templateContents.push(quote);
				// Fast forward to the string end
				index = end - 1;
				continue;
			}
		}
		if (collectedMagic.has(index)) {
			let { name, end } = collectedMagic.get(index)!;
			templateContents.push(MagicFunctions[name]());
			index = end - 1;
			continue;
		}
		if (collectedIds.has(index)) {
			let { name, end } = collectedIds.get(index)!;
			const id = (
				identifiersByName.get(name) ??
				bootstrapVariables[name as keyof typeof bootstrapVariables] ??
				createVariable(name[0], avoidIds)
			);
			identifiersByName.set(name, id);
			templateContents.push(id);
			index = end - 1;
			continue;
		}
		templateContents.push(sourceText.charCodeAt(index));
	}

	return new Template(templateContents, [new Set(identifiersByName.values())]);
}

function shouldRenameIdentifier(name: string, bootstrapVariables: IBootstrapVariables, isProp: boolean): boolean {
	if (name.startsWith('_')) {
		if (name.startsWith('__')) {
			// `__proto__` or `obj.__lookupSetter__`
			return false;
		} else {
			// `_temp1` or `omg._tempProp1`
			return true;
		}
	}
	if (!isProp) {
		if (name in bootstrapVariables) {
			// `_ctx` but not `woot._ctx`
			return true;
		}
		if (name.length === 1) {
			// `x` but not `box.x`
			return true;
		}
	}
	return false;
}

function identifierIsPropertyName(node: typescript.Identifier): boolean {
	const parentNode = node.parent;
	if (
		!typescript.isPropertyAccessExpression(parentNode) &&
		!typescript.isPropertyAssignment(parentNode)
	) {
		return false;
	}
	if (parentNode.name !== node) {
		return false;
	}
	return true;
}

function recase(character: string): ITemplatePart {
	const charCode = character.charCodeAt(0);
	const uppercased = character.toUpperCase().charCodeAt(0);
	const lowercased = character.toLowerCase().charCodeAt(0);
	if (uppercased === lowercased) {
		return charCode;
	}
	// That's only two charCodes, but with the original one first
	// That preference may be used later a as tiebreaker
	return new Set([charCode, lowercased, uppercased]);
}

function createVariable(preferredName: string, avoid?: Set<string>): ITemplateVaryingPart {
	const set: Set<number> = new Set();
	for (const ch of preferredName[0] + 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$\u00aa\u00b5\u00ba\u00c0\u00c1\u00c2\u00c3\u00c4\u00c5\u00c6\u00c7\u00c8\u00c9\u00ca\u00cb\u00cc\u00cd\u00ce\u00cf\u00d0\u00d1\u00d2\u00d3\u00d4\u00d5\u00d6\u00d8\u00d9\u00da\u00db\u00dc\u00dd\u00de\u00df\u00e0\u00e1\u00e2\u00e3\u00e4\u00e5\u00e6\u00e7\u00e8\u00e9\u00ea\u00eb\u00ec\u00ed\u00ee\u00ef\u00f0\u00f1\u00f2\u00f3\u00f4\u00f5\u00f6\u00f8\u00f9\u00fa\u00fb\u00fc\u00fd\u00fe\u00ff') {
		if (avoid !== undefined && avoid.has(ch)) {
			continue;
		}
		set.add(ch.charCodeAt(0));
	}
	return set;
}

function createHtmlAttributeSeparator(): ITemplateVaryingPart {
	return new Set(
		Array.from(' \t\n\r/', ch => ch.charCodeAt(0))
	);
}

function createHtmlWhitespace(): ITemplateVaryingPart {
	return new Set(
		Array.from(' \t\n\r', ch => ch.charCodeAt(0))
	);
}

function createRegularQuote(): ITemplateVaryingPart {
	return new Set(
		Array.from('\"\'', ch => ch.charCodeAt(0))
	);
}

function createAnyPositiveDigit(): ITemplateVaryingPart {
	return new Set(
		Array.from('123456789', ch => ch.charCodeAt(0))
	);
}

function createAnyDigit(): ITemplateVaryingPart {
	return new Set(
		Array.from('0123456789', ch => ch.charCodeAt(0))
	);
}
