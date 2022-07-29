/// <reference types="node"/>
import Crc32 from 'crc-32';
import { writeFile } from 'fs/promises';
import { deflateSync } from 'zlib';

const PNG_SINGATURE = Buffer.of(137, 80, 78, 71, 13, 10, 26, 10);

function createPng(idatContents) {
	const ihdrContents = Buffer.alloc(13);
	{
		let ptr = 0;
		ptr = ihdrContents.writeUint32BE(16, ptr);
		ptr = ihdrContents.writeUint32BE(2, ptr);
		ptr = ihdrContents.writeUint8(8, ptr); // Bit depth
		ptr = ihdrContents.writeUint8(0, ptr); // Colour type: Greyscale
		ptr = ihdrContents.writeUint8(0, ptr); // Compression method
		ptr = ihdrContents.writeUint8(0, ptr); // Filtering method
		ptr = ihdrContents.writeUint8(0, ptr); // Interlace method: No interlace
	}

	const ihdr = createChunk(ihdrContents, 'IHDR');
	const idat = createChunk(idatContents, 'IDAT');


	return Buffer.concat([
		PNG_SINGATURE,
		ihdr,
		idat.subarray(0, idat.length - 4),
	]);
}

function createChunk(contents, name) {
	const chunk = Buffer.concat([
		Buffer.alloc(8),
		contents,
		Buffer.alloc(4)
	]);
	chunk.writeUint32BE(contents.byteLength, 0);
	chunk.write(name, 4);
	const crc32 = Crc32.buf(chunk.subarray(4, -4))
	chunk.writeInt32BE(crc32, chunk.length - 4);
	return chunk;
}

const deflated = deflateSync(Buffer.of(
	1, 0x00, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08,
), {level: 9});

const png = createPng(deflated.subarray(0, deflated.byteLength - 4), 16);

writeFile('x.png', png);
