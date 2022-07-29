/**
 * @param {ArrayLike<number|ReadonlySet<number>>} bytes
 * @param {number} [dataStartOffset]
 * @returns {number}
 */
export function estimateEntropy(bytes, dataStartOffset) {
	return getInfoContent(getValuesStats(bytes, dataStartOffset));
}

/**
 * @param {ArrayLike<number|ReadonlySet<number>>} bytes
 * @param {number} [dataStartOffset]
 * @returns {Map<number|ReadonlySet<number>, number>}
 */
function getValuesStats(bytes, dataStartOffset=0) {
	const trigramsDefined = new Set();
	/** @type {Map<number, number>} */
	const valuesStats = new Map();

	let inTrigramLeft = 0;
	for (let i = 0; i < bytes.length; i++) {
		inTrigramLeft--;

		if (
			i + 2 < bytes.length &&
			typeof bytes[i] === 'number' &&
			typeof bytes[i + 1] === 'number' &&
			typeof bytes[i + 2] === 'number'
		) {
			const trigramHash = (bytes[i]) | (bytes[i + 1] << 8) | (bytes[i + 2] << 16);
			if (i >= dataStartOffset && trigramsDefined.has(trigramHash)) {
				inTrigramLeft = 2;
			}
			trigramsDefined.add(trigramHash);
		}

		if (i >= dataStartOffset && inTrigramLeft <= 0) {
			const value = inTrigramLeft === 0 ? 257 : bytes[i];
			valuesStats.set(value, -~valuesStats.get(value));
		}
	}

	return valuesStats
}

/**
 * Estimates the informational content of the buffer.
 * The less this value, the less would be the compressed data.
 * It's not accurate, the values may vary in a ~12.5% range.
 * But at least it's 1000 times faster than the real compression.
 * @param {ReadonlyMap<unknown, number>} valuesStats
 * @returns {number}
 */
function getInfoContent(valuesStats) {
	let totalOccurences = 0;
	for (const v of valuesStats.values()) {
		totalOccurences += v;
	}
	const logTotal = Math.log2(totalOccurences);
	
	// ~6 bits of the distance code for each backref
	let infoContent = (valuesStats.get(257) || 0) * 6;
	for (const v of valuesStats.values()) {
		infoContent += v * (logTotal - Math.log2(v));
	}
	return infoContent;
}
