import { TemplateError } from './template.js';
export function inferFromFrequency({ template, dataStartOffset, usedBackrefIndices, }) {
    const buckets = bucketedByOccurence(template, usedBackrefIndices, dataStartOffset);
    let newTemplate = template;
    while (buckets.length > 0) {
        const bucket = buckets.pop();
        let bestNewOccurences = -Infinity;
        let bestCandidate = null;
        for (const candidate of applyAllValues(newTemplate, bucket)) {
            const newOccurences = getOccurences(newTemplate, usedBackrefIndices, dataStartOffset, candidate.value);
            if (newOccurences > bestNewOccurences) {
                bestCandidate = candidate;
                bestNewOccurences = newOccurences;
            }
        }
        if (bestCandidate === null) {
            continue;
        }
        bucket.delete(bestCandidate.value);
        if (bucket.size > 0) {
            buckets.push(bucket);
        }
        newTemplate = bestCandidate.template;
    }
    console.log(newTemplate.dump());
    return newTemplate;
}
function* applyAllValues(template, values) {
    for (const value of values) {
        yield* applyValue(template, value);
    }
}
function* applyValue(template, value) {
    if (value === 34 || value === 39) {
        debugger;
    }
    const matchingParts = new Set();
    for (const part of template.contents) {
        if (typeof part === 'number') {
            continue;
        }
        if (!part.has(value)) {
            continue;
        }
        matchingParts.add(part);
    }
    if (matchingParts.size === 0) {
        return;
    }
    const partsQueue = [...matchingParts];
    for (let startIndex = 0; startIndex < partsQueue.length; startIndex++) {
        let newTemplate = template;
        for (let i = 0; i < partsQueue.length; i++) {
            const index = (startIndex + i) % partsQueue.length;
            try {
                newTemplate = newTemplate.replacePart(partsQueue[index], value);
            }
            catch (e) {
                if (e instanceof TemplateError) {
                    continue;
                }
                else {
                    throw e;
                }
            }
        }
        if (newTemplate !== template) {
            yield { value, template: newTemplate };
        }
    }
}
function getStats(template, usedBackrefIndices, dataStartOffset) {
    const stats = new Map();
    for (let i = 0; i < 256; i++) {
        stats.set(i, 0);
    }
    for (let i = dataStartOffset; i < template.contents.length; i++) {
        if (usedBackrefIndices.has(i)) {
            continue;
        }
        const item = template.contents[i];
        if (typeof item !== 'number') {
            continue;
        }
        stats.set(item, stats.get(item) + 1);
    }
    return stats;
}
function bucketedByOccurence(template, usedBackrefIndices, dataStartOffset) {
    const rv = [];
    let lastOccurences = -Infinity;
    const stats = getStats(template, usedBackrefIndices, dataStartOffset);
    const sorted = [...stats].sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
    for (const [value, occurences] of sorted) {
        if (occurences > lastOccurences) {
            rv.push(new Set());
            lastOccurences = occurences;
        }
        if (occurences >= lastOccurences) {
            rv[rv.length - 1].add(value);
        }
    }
    return rv;
}
function getOccurences(template, usedBackrefIndices, dataStartOffset, value) {
    let count = 0;
    for (let i = dataStartOffset; i < template.contents.length; i++) {
        if (usedBackrefIndices.has(i)) {
            continue;
        }
        if (template.contents[i] === value) {
            count++;
        }
    }
    return count;
}
