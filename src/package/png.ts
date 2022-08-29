import { ProcessingState } from './interface.js';
import { mergeBinary } from './alcorhythms.js';
import CRC32 from 'crc-32';
import { WasmZopfliNode } from 'fetchcrunch/wasm-zopfli-node';

const PNG_SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)

export async function createPng(processingState: Pick<ProcessingState, 'bytes' | 'dataStartOffset' | 'zopfliIterations' | 'shouldCheckHtml'>): Promise<Uint8Array | null> {
	const idat = await createIdat(
		processingState.bytes,
		processingState.dataStartOffset,
		processingState.zopfliIterations,
		processingState.shouldCheckHtml
	);
	if (idat === null) {
		return null;
	}
	return mergeBinary(
		PNG_SIGNATURE,
		createIhdr(processingState.dataStartOffset - 1),
		idat
	);
}

function createIhdr(imageWidth: number): Uint8Array {
	const ihdr = new Uint8Array(4 + 4 + 13 + 4);
	const dataView = new DataView(ihdr.buffer);
	dataView.setUint32(0, ihdr.length - 12, false);
	ihdr.set([0x49, 0x48, 0x44, 0x52], 4);
	dataView.setUint32(8, imageWidth, false);
	dataView.setUint32(12, 2, false);
	dataView.setUint8(16, 8);
	dataView.setUint32(ihdr.length - 4, CRC32.buf(ihdr.subarray(4, -4)), false);
	return ihdr;
}

let compressor: WasmZopfliNode | null = null;

async function createIdat(bytes: Uint8Array, dataStartOffset: number, zopfliIterations: number | undefined, shouldCheckHtml: boolean): Promise<Uint8Array | null> {
	compressor ??= new WasmZopfliNode();
	const plain = bytes.subarray(0, dataStartOffset);
	const compressed = await compressor.deflateRaw(
		bytes.subarray(dataStartOffset),
		{
			dictionary: plain,
			numIterations: zopfliIterations,
		}
	);
	if (shouldCheckHtml && !checkHtml(compressed)) {
		return null;
	}
	const idat = mergeBinary(
		new Uint8Array(4), // Chunk length: to be set later
		Uint8Array.of(0x49, 0x44, 0x41, 0x54), // IDAT
		Uint8Array.of(0x78, 0xda), // ZLIB header
		Uint8Array.of(0x00), // Non-final chunk type=00 ("stored")
		Uint8Array.of(
			plain.length & 0xff, plain.length >>> 8,
			~plain.length & 0xff, ~plain.length >>> 8,
		),
		plain,
		compressed,
		// No ADLER32 checksum
		// No CRC32 chunk checksum
	);
	new DataView(idat.buffer).setUint32(0, idat.length - 8, false);
	return idat;
}

function checkHtml(compressed: Uint8Array): boolean {
	const asText = new TextDecoder().decode(compressed);
	return asText.replace(/=\s*("|').*?\1/g, '').includes('>');
}