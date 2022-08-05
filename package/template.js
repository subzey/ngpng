import typescript from 'typescript';
const MagicFunctions = {
    _anyDigit: createAnyDigit,
    _anyPositiveDigit: createAnyPositiveDigit,
};
export function createTemplate(sourceText) {
    const variables = {
        _canvas: createVariable('c'),
        _ctx: createVariable('b'),
        _zero: createVariable('t'),
        _evaledString: createVariable('e'),
        _negative: createVariable('p'),
    };
    const onloadTemplate = createJsTemplate("_ctx=_canvas.getContext`2d`;for(_negative=_evaledString='';_zero=_ctx.getImageData(159,0,_anyPositiveDigit(),!_ctx.drawImage(this,_negative--,0)).data[0];)_evaledString+=String.fromCharCode(_zero);(_anyDigit(),eval)(e)", variables);
    const payloadTemplate = createJsTemplate(sourceText, variables);
    const [htmlHead, htmlMid, htmlTail] = "<canvas/id=🎨><img/onload=🏭 src=#>".split(/[🎨🏭]/u).map(createHtmlTemplate);
    return mergeTemplates(htmlHead, { contents: [variables._canvas], exclusiveGroups: [] }, htmlMid, onloadTemplate, htmlTail, payloadTemplate);
}
function createHtmlTemplate(template) {
    const templateContents = [];
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
    };
}
function createJsTemplate(sourceText, bootstrapVariables) {
    const collectedIds = new Map();
    const collectedQuotes = new Map();
    const collectedMagic = new Map();
    // Serious business
    const sourceFile = typescript.createSourceFile('payload.js', sourceText, typescript.ScriptTarget.ESNext, true, typescript.ScriptKind.JS);
    const traverse = (node) => {
        if (typescript.isCallExpression(node)) {
            const calleeNode = node.expression;
            if (typescript.isIdentifier(calleeNode) && !identifierIsPropertyName(calleeNode)) {
                const calleeName = calleeNode.text;
                if (MagicFunctions.hasOwnProperty(calleeName)) {
                    const start = node.getStart(sourceFile);
                    const end = node.getEnd();
                    collectedMagic.set(start, { name: calleeName, end });
                    return;
                }
            }
        }
        if (typescript.isIdentifier(node)) {
            const name = node.text;
            if (shouldRenameIdentifier(name, bootstrapVariables, identifierIsPropertyName(node))) {
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
        if (collectedMagic.has(index)) {
            let { name, end } = collectedMagic.get(index);
            templateContents.push(MagicFunctions[name]());
            index = end - 1;
            continue;
        }
        if (collectedIds.has(index)) {
            let { name, end } = collectedIds.get(index);
            const id = (identifiersByName.get(name) ??
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
function mergeTemplates(...templates) {
    return {
        contents: [].concat(...templates.map(t => t.contents)),
        exclusiveGroups: [].concat(...templates.map(t => t.exclusiveGroups)),
    };
}
function shouldRenameIdentifier(name, bootstrapVariables, isProp) {
    if (name.startsWith('_')) {
        if (name.startsWith('__')) {
            // `__proto__` or `obj.__lookupSetter__`
            return false;
        }
        else {
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
function identifierIsPropertyName(node) {
    const parentNode = node.parent;
    if (!typescript.isPropertyAccessExpression(parentNode) &&
        !typescript.isPropertyAssignment(parentNode)) {
        return false;
    }
    if (parentNode.name !== node) {
        return false;
    }
    return true;
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
function createAnyPositiveDigit() {
    return new Set(Array.from('123456789', ch => ch.charCodeAt(0)));
}
function createAnyDigit() {
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
