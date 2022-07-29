import { readFile } from 'node:fs/promises';
import { WasmZopfliNode } from 'fetchcrunch/wasm-zopfli-node';
import { estimateEntropy } from './estimate-entropy.js';

async function main() {
	const deflater = new WasmZopfliNode();
	const testSource = await readFile('./example-source.js');

	const dictSize = 100;
	const sampleSize = 1100;

	let estimateTime = 0;
	let realTime = 0;

	for (let i = 0; i < testSource.byteLength - dictSize - sampleSize; i += 100) {
		const slice = testSource.subarray(i, i + dictSize + sampleSize);

		let now;
		now = performance.now();
		const estimated = estimateEntropy(slice, dictSize);
		estimateTime += (performance.now() - now);

		now = performance.now();
		const deflated = await deflater.deflateRaw(slice.subarray(dictSize), { dictionary: slice.subarray(0, dictSize)});
		realTime += (performance.now() - now);

		// process.stdout.write(`${deflated.byteLength} ${estimated} `);
	}

	console.log('Estimate', estimateTime);
	console.log('Real', realTime);
}

main();