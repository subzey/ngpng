import { ITemplatePart, ITemplateVaryingPart } from "./moving-part";

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

function createBootstrap(): ITemplate {
	const t = "<canvas id=c><img onload=b=c.getContext`2d`;for(p=e='';t=b.getImageData(159,0,1,!b.drawImage(this,p--,0)).data[0];)e+=String.fromCharCode(t);(1,eval)(e) src=#>";
	const f = "_^^^^^^A^^_V__^^^A^^^^^^_V_V____________________V_V_QQ_V_V____________________P__V_________________________________V______________________V___I_______V_W^^^___";

	const variablesByName: Map<string, ITemplateVaryingPart> = new Map();
	const contents: ITemplatePart[] = [];
	const quote = createRegularQuote();

	for (let i = 0; i < t.length; i++) {
		const character = t[i];
		switch (f[i]) {
			case '_': // Nothing
				contents.push(t.charCodeAt(0));
				break;
			case '^': // Recase
				contents.push(recase(character));
				break;
			case 'A': // Attribute separator
				contents.push(createHtmlAttributeSeparator());
				break;
			case 'W': // Some attributes cannot be separated by /
				contents.push(createHtmlWhitespace());
				break;
			case 'Q':
				contents.push(quote); // Both quotes are the same
				break;
			case 'P':
				contents.push(createPositiveInteger());
				break;
			case 'I':
				contents.push(createInteger());
				break;
			case 'V': // Variable
				let variable = variablesByName.get(character);
				if (variable === undefined) {
					variable = createVariable(character);
					variablesByName.set(character, variable);
				}
				contents.push(variable);
				break;
			default:
				throw new Error('Unreachable');
		}
	}

	const variableExclusiveGroup = new Set(variablesByName.values());

	return {
		contents,
		exclusiveGroups: [variableExclusiveGroup],
	};
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

function createPositiveInteger(): ITemplateVaryingPart {
	return new Set(
		Array.from('123456789', ch => ch.charCodeAt(0))
	);
}

function createInteger(): ITemplateVaryingPart {
	return new Set(
		Array.from('0123456789', ch => ch.charCodeAt(0))
	);
}