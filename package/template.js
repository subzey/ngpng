import typescript from 'typescript';
export function createBootstrapTemplate() {
    const t = "<canvas id=c><img onload=b=c.getContext`2d`;for(p=e='';t=b.getImageData(159,0,1,!b.drawImage(this,p--,0)).data[0];)e+=String.fromCharCode(t);(1,eval)(e) src=#>";
    const f = "_^^^^^^A^^_V__^^^A^^^^^^_V_V____________________V_V_QQ_V_V____________________P__V________________V________________V______________________V___I_______V_W^^^___";
    const variablesByName = new Map();
    const contents = [];
    const quote = createRegularQuote();
    for (let i = 0; i < t.length; i++) {
        const character = t[i];
        switch (f[i]) {
            case '_': // Nothing
                contents.push(character.charCodeAt(0));
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
        variables: Object.assign(Object.create(null), // We don't want "__proto__" to be a valid key
        {
            _canvas: variablesByName.get('c'),
            _ctx: variablesByName.get('b'),
            _evaledString: variablesByName.get('e'),
            _zero: variablesByName.get('t')
        }),
    };
}
export function createPayloadTemplate(sourceText, bootstrapVariables) {
    const collectedIds = new Map();
    const collectedQuotes = new Map();
    // Serious business
    const sourceFile = typescript.createSourceFile('payload.js', sourceText, typescript.ScriptTarget.ESNext, true, typescript.ScriptKind.JS);
    const traverse = (node) => {
        // console.log(typescript.SyntaxKind[node.kind]);
        if (typescript.isIdentifier(node)) {
            const name = node.text;
            if (shouldRenameIdentifier(name, bootstrapVariables)) {
                const start = node.getStart(sourceFile);
                const end = node.getEnd();
                collectedIds.set(start, { name, end });
            }
        }
        else if (typescript.isStringLiteral(node)) {
            collectedQuotes.set(node.getStart(), { end: node.getEnd() });
        }
        node.forEachChild(traverse);
    };
    sourceFile.forEachChild(traverse);
    const identifiersByName = new Map();
    const templateContents = [];
    for (let index = 0; index < sourceText.length; index++) {
        if (collectedQuotes.has(index)) {
            // Quote replacement
            const { end } = collectedQuotes.get(index);
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
        if (collectedIds.has(index)) {
            let { name, end } = collectedIds.get(index);
            let id = (identifiersByName.get(name) ??
                bootstrapVariables[name] ??
                createVariable(name[0]));
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
    };
}
function shouldRenameIdentifier(name, bootstrapVariables) {
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
function recase(character) {
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
function createVariable(preferredName) {
    return new Set(Array.from(preferredName + 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$', ch => ch.charCodeAt(0)));
}
function createHtmlAttributeSeparator() {
    return new Set(Array.from(' \t\n\r/', ch => ch.charCodeAt(0)));
}
function createHtmlWhitespace() {
    return new Set(Array.from(' \t\n\r', ch => ch.charCodeAt(0)));
}
function createRegularQuote() {
    return new Set(Array.from('\"\'', ch => ch.charCodeAt(0)));
}
function createPositiveInteger() {
    return new Set(Array.from('123456789', ch => ch.charCodeAt(0)));
}
function createInteger() {
    return new Set(Array.from('0123456789', ch => ch.charCodeAt(0)));
}
export function dumpTemplate(template) {
    let rv = '';
    const fmt = (charCode) => {
        if (charCode === 0x0A || charCode === 0x0D) {
            return '⮠';
        }
        if (charCode === 0x09) {
            return '⇥';
        }
        return String.fromCharCode(charCode);
    };
    for (const item of template) {
        if (typeof item === 'number') {
            rv += fmt(item);
        }
        else {
            rv += '⟦' + Array.from(item, fmt).join('') + '⟧';
        }
    }
    return rv;
}
