import { readFile } from 'fs/promises';
import { inflateSync, deflateSync } from 'zlib';


async function main() {
	const contents = await readFile('monospace.png');
	const idatStart = 0x21;
	const payloadStart = idatStart + 8;
	const payloadLength = contents.readUInt32BE(idatStart);
	console.log(contents.subarray(payloadStart - 4, payloadStart).toString());
	const payload = contents.subarray(payloadStart, payloadStart + payloadLength);
	console.log(payload);
	console.log(inflateSync(payload).toString());
}

main();