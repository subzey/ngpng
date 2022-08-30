// 🍻🥁

export function * bucketed<T>(
	source: Iterable<T>,
	getBucketId: (item: T) => unknown
): IterableIterator<T[]> {
	let bucket: T[] = [];
	let lastBucketId: unknown;
	for (const item of source) {
		const bucketId = getBucketId(item);
		if (bucket.length > 0 && bucketId !== lastBucketId) {
			yield bucket;
			bucket = [];
		}
		lastBucketId = bucketId;
		bucket.push(item);
	}
	if (bucket.length > 0) {
		yield bucket;
	}
}

export function getLowerBoundIndex<T>(array: ArrayLike<T>, value: T): number {
	let lowerBoundIndex = 0;
	let upperBoundIndex = array.length;

	while (lowerBoundIndex < upperBoundIndex - 1) {
		let midPointIndex = (lowerBoundIndex + upperBoundIndex) >> 1;
		if (array[midPointIndex] <= value) {
			lowerBoundIndex = midPointIndex;
		} else {
			upperBoundIndex = midPointIndex;
		}
	}
	return lowerBoundIndex;
}

export function mergeBinary(...chunks: Uint8Array[]): Uint8Array {
	let length = 0;
	for (let i = 0; i < chunks.length; i++) {
		length += chunks[i].length;
	}
	const rv = new Uint8Array(length);
	length = 0;
	for (let i = 0; i < chunks.length; i++) {
		rv.set(chunks[i], length);
		length += chunks[i].length;
	}
	return rv;
}

export function getTopItems<T>(items: Iterable<T>, getScore: (arg: T) => number): T[] {
	let bestItems: T[] = [];
	let bestScore = -Infinity;
	for (const item of items) {
		const score = getScore(item);
		if (score > bestScore) {
			bestItems = [];
			bestScore = score;
		}
		if (score === bestScore) {
			bestItems.push(item);
		}
	}
	return bestItems;
}