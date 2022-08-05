export function intersect(a, b) {
    if (typeof a === 'number') {
        if (typeof b === 'number') {
            return a === b ? a : undefined;
        }
        return intersectPrimitive(a, b);
    }
    if (typeof b === 'number') {
        return intersectPrimitive(b, a);
    }
    return intersectSets(a, b);
}
function intersectPrimitive(a, b) {
    if (!b.has(a)) {
        return undefined;
    }
    if (b.size === 1) {
        return a;
    }
    let lastValue = 0;
    let newSet = new Set();
    for (lastValue of b) {
        newSet.add(lastValue);
    }
    if (newSet.size === 1) {
        return lastValue;
    }
    return newSet;
}
function intersectSets(a, b) {
    const newSet = new Set();
    let lastValue = 0;
    const larger = a.size > b.size ? a : b;
    const smaller = larger === b ? a : b;
    for (const value of smaller) {
        if (larger.has(value)) {
            lastValue = value;
            newSet.add(value);
        }
    }
    if (newSet.size === 0) {
        return undefined;
    }
    if (newSet.size === 1) {
        return lastValue;
    }
    return newSet;
}
/** kept \ excluded  */
export function exclude(filtered, excluded) {
    if (typeof filtered === 'number') {
        if (typeof excluded === 'number') {
            return excluded === filtered ? undefined : filtered;
        }
        return excluded.has(filtered) ? undefined : filtered;
    }
    if (typeof excluded === 'number') {
        return excludePrimitive(filtered, excluded);
    }
    return excludeSet(filtered, excluded);
}
function excludeSet(filtered, excluded) {
    if (excluded.size === 0) {
        return filtered;
    }
    let lastValue = 0;
    const newSet = new Set();
    for (const value of filtered) {
        if (excluded.has(value)) {
            continue;
        }
        lastValue = value;
        newSet.add(value);
    }
    if (newSet.size === 0) {
        return undefined;
    }
    if (newSet.size === 1) {
        return lastValue;
    }
    return newSet;
}
function excludePrimitive(filtered, excluded) {
    if (!filtered.has(excluded)) {
        return filtered;
    }
    let lastValue = 0;
    const newSet = new Set();
    for (const value of filtered) {
        if (value === excluded) {
            continue;
        }
        lastValue = value;
        newSet.add(value);
    }
    if (newSet.size === 0) {
        return undefined;
    }
    if (newSet.size === 1) {
        return lastValue;
    }
    return newSet;
}