import { Template } from "./template.js";
import typescript from 'typescript';
const MagicFunctions = {
    _anyDigit: createAnyDigit,
    _anyPositiveDigit: createAnyPositiveDigit,
};
export function createTemplate(sourceText, keepNames = new Set()) {
    const variables = {
        _canvas: createVariable('c'),
        _ctx: createVariable('b'),
        _zero: createVariable('t'),
        _evaledString: createVariable('e'),
        _negative: createVariable('p'),
    };
    const onloadTemplate = createJsTemplate("_ctx=_canvas.getContext`2d`;for(_negative=_evaledString='';_zero=_ctx.getImageData(159,0,_anyPositiveDigit(),!_ctx.drawImage(this,_negative--,0)).data[0];)_evaledString+=String.fromCharCode(_zero);(_anyDigit(),eval)(e)", variables, new Set());
    const payloadTemplate = createJsTemplate(sourceText, variables, keepNames);
    const pngFilter = new Template([new Set([0, 2])], []);
    const [htmlHead, htmlMid, htmlTail] = "<canvas/id=🎨><img/onload=🏭 src=#>".split(/[🎨🏭]/u).map(createHtmlTemplate);
    const mergedTemplate = Template.merge(pngFilter, htmlHead, new Template([variables._canvas], []), htmlMid, onloadTemplate, htmlTail, payloadTemplate);
    return {
        template: mergedTemplate,
        dataStartOffset: mergedTemplate.contents.length - payloadTemplate.contents.length,
    };
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
    return new Template(templateContents, []);
}
function createJsTemplate(sourceText, bootstrapVariables, keepNames) {
    const collectedIds = new Map();
    const collectedQuotes = new Map();
    const collectedMagic = new Map();
    const avoidIds = new Set();
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
            if (keepNames.has(name)) {
                avoidIds.add(name);
            }
            else if (shouldRenameIdentifier(name, bootstrapVariables, identifierIsPropertyName(node))) {
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
                createVariable(name[0], avoidIds));
            identifiersByName.set(name, id);
            templateContents.push(id);
            index = end - 1;
            continue;
        }
        templateContents.push(sourceText.charCodeAt(index));
    }
    return new Template(templateContents, [new Set(identifiersByName.values())]);
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
function createVariable(preferredName, avoid) {
    const set = new Set();
    for (const ch of preferredName[0] + 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$\u00aa\u00b5\u00ba\u00c0\u00c1\u00c2\u00c3\u00c4\u00c5\u00c6\u00c7\u00c8\u00c9\u00ca\u00cb\u00cc\u00cd\u00ce\u00cf\u00d0\u00d1\u00d2\u00d3\u00d4\u00d5\u00d6\u00d8\u00d9\u00da\u00db\u00dc\u00dd\u00de\u00df\u00e0\u00e1\u00e2\u00e3\u00e4\u00e5\u00e6\u00e7\u00e8\u00e9\u00ea\u00eb\u00ec\u00ed\u00ee\u00ef\u00f0\u00f1\u00f2\u00f3\u00f4\u00f5\u00f6\u00f8\u00f9\u00fa\u00fb\u00fc\u00fd\u00fe\u00ff') {
        if (avoid !== undefined && avoid.has(ch)) {
            continue;
        }
        set.add(ch.charCodeAt(0));
    }
    return set;
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
