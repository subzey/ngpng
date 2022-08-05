import { ITemplatePart, ITemplateVaryingPart } from "./moving-part";
import typescript from 'typescript';

interface ITemplate {
	/** Numbers or sets of numbers to pick from */
	readonly contents: readonly ITemplatePart[];
	/** 
	 * All the sets inside a group should end up with the different values.
	 * Those are typically the variable names. `[ Set{ a, b }, Set{ a, b } ]`
	 * may become `[a, b]` or `[b, a]`, but not `[a, a]` or `[b, b]`
	 */
	readonly exclusiveGroups: readonly ReadonlySet<ITemplatePart>[];
}

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

type MagicFunctionName = keyof typeof MagicFunctions

export function createTemplate(sourceText: string) {
	const variables: IBootstrapVariables = {
		_canvas: createVariable('c'),
		_ctx: createVariable('b'),
		_zero: createVariable('t'),
		_evaledString: createVariable('e'),
		_negative: createVariable('p'),
	};
	const onloadTemplate = createJsTemplate(
		"_ctx=_canvas.getContext`2d`;for(_negative=_evaledString='';_zero=_ctx.getImageData(159,0,_anyPositiveDigit(),!_ctx.drawImage(this,_negative--,0)).data[0];)_evaledString+=String.fromCharCode(_zero);(_anyDigit(),eval)(e)",
		variables
	);
	const payloadTemplate = createJsTemplate(
		sourceText,
		variables
	);

	const [htmlHead, htmlMid, htmlTail] = "<canvas/id=🎨><img/onload=🏭 src=#>".split(/[🎨🏭]/u).map(createHtmlTemplate);

	return mergeTemplates(
		htmlHead,
		{ contents: [variables._canvas], exclusiveGroups: []},
		htmlMid,
		onloadTemplate,
		htmlTail,
		payloadTemplate
	);
}

function createHtmlTemplate(template: string): ITemplate {
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
	return {
		contents: templateContents,
		exclusiveGroups: [],
	}
}

function createJsTemplate(sourceText: string, bootstrapVariables: IBootstrapVariables): ITemplate {
	const collectedIds: Map<number, { name: string, end: number }> = new Map();
	const collectedQuotes: Map<number, { end: number }> = new Map();
	const collectedAnys: Map<number, { name: MagicFunctionName, end: number }> = new Map();


	// Serious business
	const sourceFile = typescript.createSourceFile(
		'payload.js',
		sourceText,
		typescript.ScriptTarget.ESNext,
		true,
		typescript.ScriptKind.JS
	);
	const traverse = (node: typescript.Node): void => {
		// console.log(typescript.SyntaxKind[node.kind]);
		if (typescript.isCallExpression(node)) {
			const calleeNode = node.expression;
			if (typescript.isIdentifier(calleeNode)) {
				const calleeName = calleeNode.text;
				if (MagicFunctions.hasOwnProperty(calleeName)) {
					const start = node.getStart(sourceFile);
					const end = node.getEnd();
					collectedAnys.set(start, { name: calleeName as MagicFunctionName, end });
					return;
				}
			}
		}
		if (typescript.isIdentifier(node)) {
			const name = node.text;
			if (shouldRenameIdentifier(name, bootstrapVariables)) {
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
		if (collectedAnys.has(index)) {
			let { name, end } = collectedAnys.get(index)!;
			templateContents.push(MagicFunctions[name]());
			index = end - 1;
			continue;
		}
		if (collectedIds.has(index)) {
			let { name, end } = collectedIds.get(index)!;
			const id = (
				identifiersByName.get(name) ??
				bootstrapVariables[name as keyof typeof bootstrapVariables] ??
				createVariable(name[0])
			);
			identifiersByName.set(name, id);
			templateContents.push(id);
			index = end - 1;
			continue;
		}
		templateContents.push(sourceText.charCodeAt(index));
	}


	return {
		contents: templateContents,
		exclusiveGroups: [new Set(identifiersByName.values())],
	}
}

function mergeTemplates(...templates: ITemplate[]): ITemplate {
	return {
		contents: ([] as ITemplatePart[]).concat(...templates.map(t => t.contents)),
		exclusiveGroups: ([] as ReadonlySet<ITemplatePart>[]).concat(...templates.map(t => t.exclusiveGroups)),
	};
}

function shouldRenameIdentifier(name: string, bootstrapVariables: IBootstrapVariables): boolean {
	if (name.length === 1) {
		return true;
	}
	if (name.startsWith('__')) {
		return false;
	}
	if (name.startsWith('_')) {
		return true;
	}
	if (name in bootstrapVariables) {
		return true;
	}
	return false;
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

function createVariable(preferredName: string): ITemplateVaryingPart {
	return new Set(
		Array.from(preferredName + 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$', ch => ch.charCodeAt(0))
	);
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

export function dumpTemplate(template: readonly ITemplatePart[]): string {
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

	for (const item of template) {
		if (typeof item === 'number') {
			rv += fmt(item);
		} else {
			rv += '⟦' + Array.from(item, fmt).join('') + '⟧';
		}
	}
	return rv;
}