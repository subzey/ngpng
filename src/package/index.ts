import { createTemplate } from './create-template.js';
import { inferFromBackrefs } from './backrefs.js';
import { inferFromFrequency } from './frequency.js';
import { createPng } from './png.js';
import { ITemplate, ProcessingState } from './interface.js';

export interface Options {
	keepNames?: Set<string>;
	zopfliIterations?: number;
}

export async function run(jsSource: string, options?: Options) {
	let bestSize = Infinity;
	let bestPng: Uint8Array | null = null;
	for await (const png of runAll(jsSource, options)) {
		if (png.length < bestSize) {
			bestSize = png.length;
			bestPng = png;
		}
	}
	if (bestPng === null) {
		throw new Error('Could not process');
	}
	return bestPng;
}

export async function * runAll(jsSource: string, options?: Options): AsyncIterableIterator<Uint8Array> {
	let template: ProcessingState['template'];
	let dataStartOffset: ProcessingState['dataStartOffset'];
	let shouldCheckHtml: ProcessingState['shouldCheckHtml'];
	let usedBackrefIndices: ProcessingState['usedBackrefIndices'];
	for ({ template, dataStartOffset, shouldCheckHtml} of createTemplate(jsSource, options?.keepNames)) {
		for ({ template, usedBackrefIndices } of inferFromBackrefs({ template, dataStartOffset })) {
			template = inferFromFrequency({ template, dataStartOffset, usedBackrefIndices }).template;
			const bytes = bytesFromTemplate(template);
			if (bytes === null) {
				continue;
			}
			const png = await createPng({ dataStartOffset, bytes, zopfliIterations: options?.zopfliIterations, shouldCheckHtml });
			if (png === null) {
				continue;
			}
			yield png;
		}
	}
}

function bytesFromTemplate(template: ITemplate): Uint8Array | null {
	const rv = new Uint8Array(template.contents.length);
	for (let i = 0; i < rv.length; i++) {
		if (typeof template.contents[i] === 'number') {
			rv[i] = template.contents[i] as number;
		}
		return null;
	}
	return rv;
}
